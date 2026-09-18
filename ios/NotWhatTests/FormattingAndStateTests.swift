import XCTest
@testable import NotWhat

final class FormattingAndStateTests: XCTestCase {
    func testSellerOrderStatusDecodingMapsBackendAliases() throws {
        let shipped = try JSONDecoder().decode(SellerOrderStatus.self, from: #""in_transit""#.data(using: .utf8)!)
        let placed = try JSONDecoder().decode(SellerOrderStatus.self, from: #""pending""#.data(using: .utf8)!)

        XCTAssertEqual(shipped, .shipped)
        XCTAssertEqual(placed, .placed)
        XCTAssertEqual(shipped.displayName, "Shipped")
    }

    func testPaymentStatusDecodingMapsRefundAndFailureAliases() throws {
        let failed = try JSONDecoder().decode(PaymentStatus.self, from: #""declined""#.data(using: .utf8)!)
        let partial = try JSONDecoder().decode(PaymentStatus.self, from: #""partial_refund""#.data(using: .utf8)!)

        XCTAssertEqual(failed, .failed)
        XCTAssertEqual(partial, .partiallyRefunded)
    }

    func testSellerAnalyticsOverviewDefaultsMissingMetricsToZero() throws {
        let data = #"{"grossSales":1250}"#.data(using: .utf8)!
        let overview = try JSONDecoder().decode(SellerAnalyticsOverview.self, from: data)

        XCTAssertEqual(overview.grossSales, 1250)
        XCTAssertEqual(overview.netEarnings, 0)
        XCTAssertEqual(overview.returnRate, 0)
        XCTAssertEqual(overview.commissionPercentage, 0)
    }
}
