import XCTest
@testable import NotWhat

final class APIClientTests: XCTestCase {
    override func tearDown() {
        MockURLProtocol.requestHandler = nil
        super.tearDown()
    }

    func testGetBuildsURLWithQueryAndAuthToken() async throws {
        let client = APIClient(
            baseURL: URL(string: "https://api.test/api")!,
            session: MockFixtures.session(),
            tokenProvider: { "token-123" }
        )

        MockURLProtocol.requestHandler = { request in
            XCTAssertEqual(request.url?.absoluteString, "https://api.test/api/seller/analytics/overview?range=7d")
            XCTAssertEqual(request.value(forHTTPHeaderField: "Authorization"), "Bearer token-123")
            let response = HTTPURLResponse(url: request.url!, statusCode: 200, httpVersion: nil, headerFields: nil)!
            return (response, MockFixtures.envelope(#"{"grossSales":0,"netEarnings":0,"platformCommission":0}"#))
        }

        let response: APIResponse<SellerAnalyticsOverview> = try await client.get(
            "seller/analytics/overview",
            queryItems: [URLQueryItem(name: "range", value: "7d")]
        )

        XCTAssertTrue(response.success)
        XCTAssertEqual(response.data?.grossSales, 0)
    }

    func testRequestFailureSurfacesAPIMessage() async {
        let client = APIClient(
            baseURL: URL(string: "https://api.test/api")!,
            session: MockFixtures.session()
        )

        MockURLProtocol.requestHandler = { request in
            let response = HTTPURLResponse(url: request.url!, statusCode: 403, httpVersion: nil, headerFields: nil)!
            return (response, #"{"success":false,"message":"Forbidden"}"#.data(using: .utf8)!)
        }

        do {
            let _: APIResponse<SellerAnalyticsOverview> = try await client.get("admin/analytics/platform")
            XCTFail("Expected API error")
        } catch let error as APIError {
            XCTAssertTrue(error.localizedDescription.contains("Forbidden"))
        } catch {
            XCTFail("Unexpected error \(error)")
        }
    }
}
