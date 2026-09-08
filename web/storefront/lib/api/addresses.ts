import { apiDelete, apiGet, apiPatch, apiPost } from "./client";

export type Address = {
  _id: string;
  label: string;
  contactName: string;
  contactPhone: string;
  addressLine1: string;
  addressLine2?: string;
  landmark?: string;
  locality: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  isDefault: boolean;
};

export type AddressInput = Omit<Address, "_id" | "isDefault">;

export function getAddresses(token: string) {
  return apiGet<Address[]>("/addresses/delivery", undefined, token);
}

export function addAddress(token: string, input: AddressInput) {
  return apiPost<Address>("/addresses/delivery", input, token);
}

export function updateAddress(token: string, id: string, input: Partial<AddressInput>) {
  return apiPatch<Address>(`/addresses/delivery/${id}`, input, token);
}

export function deleteAddress(token: string, id: string) {
  return apiDelete<null>(`/addresses/delivery/${id}`, token);
}

export function setDefaultAddress(token: string, id: string) {
  return apiPatch<Address>(`/addresses/delivery/${id}/default`, undefined, token);
}
