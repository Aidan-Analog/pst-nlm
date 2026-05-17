import Foundation

struct ListingsResponse: Codable {
    let channels: [Channel]
    let fetchedAt: String
    let date: String
}
