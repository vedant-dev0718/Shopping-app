"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { signupBuyerStart, signupVerifyEmail, updateMe } from "@/lib/api/auth";
import { getAddresses, addAddress, deleteAddress, setDefaultAddress, type Address, type AddressInput } from "@/lib/api/addresses";

const EMPTY_ADDRESS: AddressInput = {
  label: "Home",
  contactName: "",
  contactPhone: "",
  addressLine1: "",
  addressLine2: "",
  landmark: "",
  locality: "",
  city: "",
  state: "",
  country: "India",
  postalCode: "",
};

function AuthForms() {
  const { login, setSession } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/account";

  const [mode, setMode] = useState<"login" | "signup" | "verify">("login");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [verificationId, setVerificationId] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await login(identifier, password);
      router.push(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    }
  }

  async function handleSignupStart(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      const result = await signupBuyerStart({ name, email, password, phone, address });
      setVerificationId(result.verificationId);
      setMode("verify");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    }
  }

  async function handleVerify(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      const payload = await signupVerifyEmail(verificationId, otp);
      setSession(payload.token, payload.user);
      router.push(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    }
  }

  return (
    <section className="mx-auto max-w-md px-6 py-24">
      <h1 className="mb-8 text-center font-display text-3xl">
        {mode === "login" ? "Sign In" : mode === "signup" ? "Create Account" : "Verify Your Email"}
      </h1>

      {mode === "login" && (
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <input
            required
            placeholder="Email or phone"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            className="rounded-lg border border-[var(--color-copper)]/25 px-4 py-3 outline-none focus:border-[var(--color-copper-bright)]"
          />
          <input
            required
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-lg border border-[var(--color-copper)]/25 px-4 py-3 outline-none focus:border-[var(--color-copper-bright)]"
          />
          <button type="submit" className="rounded-full bg-gradient-to-r from-[var(--color-copper-deep)] to-[var(--color-copper-bright)] px-6 py-3 font-medium text-[var(--color-charcoal)]">
            Sign In
          </button>
          <button type="button" onClick={() => setMode("signup")} className="text-sm text-[var(--color-ink)]/60">
            New here? Create an account
          </button>
        </form>
      )}

      {mode === "signup" && (
        <form onSubmit={handleSignupStart} className="flex flex-col gap-4">
          <input required placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} className="rounded-lg border border-[var(--color-copper)]/25 px-4 py-3" />
          <input required type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-lg border border-[var(--color-copper)]/25 px-4 py-3" />
          <input required placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="rounded-lg border border-[var(--color-copper)]/25 px-4 py-3" />
          <input required placeholder="Address" value={address} onChange={(e) => setAddress(e.target.value)} className="rounded-lg border border-[var(--color-copper)]/25 px-4 py-3" />
          <input required type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="rounded-lg border border-[var(--color-copper)]/25 px-4 py-3" />
          <p className="text-xs text-[var(--color-ink)]/50">
            At least 8 characters, with an uppercase letter, a number, and a special character.
          </p>
          <button type="submit" className="rounded-full bg-gradient-to-r from-[var(--color-copper-deep)] to-[var(--color-copper-bright)] px-6 py-3 font-medium text-[var(--color-charcoal)]">
            Send Verification Code
          </button>
          <button type="button" onClick={() => setMode("login")} className="text-sm text-[var(--color-ink)]/60">
            Already have an account? Sign in
          </button>
        </form>
      )}

      {mode === "verify" && (
        <form onSubmit={handleVerify} className="flex flex-col gap-4">
          <p className="text-sm text-[var(--color-ink)]/60">Enter the code sent to {email}</p>
          <input required placeholder="OTP" value={otp} onChange={(e) => setOtp(e.target.value)} className="rounded-lg border border-[var(--color-copper)]/25 px-4 py-3" />
          <button type="submit" className="rounded-full bg-gradient-to-r from-[var(--color-copper-deep)] to-[var(--color-copper-bright)] px-6 py-3 font-medium text-[var(--color-charcoal)]">
            Verify &amp; Continue
          </button>
        </form>
      )}

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
    </section>
  );
}

function AccountDashboard() {
  const { token, user, logout } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAddress, setNewAddress] = useState<AddressInput>(EMPTY_ADDRESS);
  const [savedMessage, setSavedMessage] = useState(false);

  useEffect(() => {
    if (!token) return;
    getAddresses(token).then(setAddresses);
  }, [token]);

  async function handleSaveProfile(event: React.FormEvent) {
    event.preventDefault();
    if (!token) return;
    await updateMe(token, { name, phone });
    setSavedMessage(true);
    setTimeout(() => setSavedMessage(false), 2000);
  }

  async function handleAddAddress(event: React.FormEvent) {
    event.preventDefault();
    if (!token) return;
    const created = await addAddress(token, newAddress);
    setAddresses((prev) => [...prev, created]);
    setShowAddForm(false);
    setNewAddress(EMPTY_ADDRESS);
  }

  async function handleDeleteAddress(id: string) {
    if (!token) return;
    await deleteAddress(token, id);
    setAddresses((prev) => prev.filter((a) => a._id !== id));
  }

  async function handleSetDefault(id: string) {
    if (!token) return;
    await setDefaultAddress(token, id);
    setAddresses((prev) => prev.map((a) => ({ ...a, isDefault: a._id === id })));
  }

  return (
    <section className="mx-auto max-w-2xl px-6 py-16">
      <div className="mb-10 flex items-center justify-between">
        <h1 className="font-display text-3xl">My Account</h1>
        <button type="button" onClick={() => logout()} className="text-sm text-[var(--color-ink)]/60">
          Log Out
        </button>
      </div>

      <form onSubmit={handleSaveProfile} className="mb-12 flex flex-col gap-4 rounded-xl border border-[var(--color-copper)]/15 bg-white p-6">
        <h2 className="font-display text-xl">Profile</h2>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="rounded-lg border border-[var(--color-copper)]/25 px-4 py-3" />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" className="rounded-lg border border-[var(--color-copper)]/25 px-4 py-3" />
        <button type="submit" className="self-start rounded-full bg-gradient-to-r from-[var(--color-copper-deep)] to-[var(--color-copper-bright)] px-6 py-2 text-sm font-medium text-[var(--color-charcoal)]">
          Save Changes
        </button>
        {savedMessage && <p className="text-sm text-green-700">Saved!</p>}
      </form>

      <div className="flex flex-col gap-4">
        <h2 className="font-display text-xl">Address Book</h2>
        {addresses.map((address) => (
          <div key={address._id} className="flex items-center justify-between rounded-xl border border-[var(--color-copper)]/15 bg-white p-4">
            <div>
              <p className="font-medium">
                {address.label} {address.isDefault && <span className="ml-2 text-xs copper-text">Default</span>}
              </p>
              <p className="text-sm text-[var(--color-ink)]/60">
                {address.addressLine1}, {address.city}, {address.state} {address.postalCode}
              </p>
            </div>
            <div className="flex gap-3 text-sm">
              {!address.isDefault && (
                <button type="button" onClick={() => handleSetDefault(address._id)} className="copper-text">
                  Set Default
                </button>
              )}
              <button type="button" onClick={() => handleDeleteAddress(address._id)} className="text-red-600">
                Delete
              </button>
            </div>
          </div>
        ))}

        {!showAddForm && (
          <button type="button" onClick={() => setShowAddForm(true)} className="self-start text-sm copper-text font-medium">
            + Add new address
          </button>
        )}

        {showAddForm && (
          <form onSubmit={handleAddAddress} className="flex flex-col gap-3 rounded-xl border border-[var(--color-copper)]/20 bg-white p-4">
            {(
              [
                ["contactName", "Full name"],
                ["contactPhone", "Phone"],
                ["addressLine1", "Address line 1"],
                ["locality", "Locality"],
                ["city", "City"],
                ["state", "State"],
                ["postalCode", "Postal code"],
              ] as const
            ).map(([field, placeholder]) => (
              <input
                key={field}
                required
                placeholder={placeholder}
                value={newAddress[field]}
                onChange={(e) => setNewAddress((prev) => ({ ...prev, [field]: e.target.value }))}
                className="rounded-lg border border-[var(--color-copper)]/25 px-3 py-2 text-sm"
              />
            ))}
            <button type="submit" className="self-start rounded-full bg-gradient-to-r from-[var(--color-copper-deep)] to-[var(--color-copper-bright)] px-6 py-2 text-sm font-medium text-[var(--color-charcoal)]">
              Save Address
            </button>
          </form>
        )}
      </div>
    </section>
  );
}

export default function AccountPage() {
  const { token, isLoading } = useAuth();

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-cream)]">
      <SiteHeader />
      <main className="flex-1">
        {isLoading ? (
          <p className="py-24 text-center text-[var(--color-ink)]/50">Loading…</p>
        ) : token ? (
          <AccountDashboard />
        ) : (
          <Suspense fallback={<p className="py-24 text-center text-[var(--color-ink)]/50">Loading…</p>}>
            <AuthForms />
          </Suspense>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
