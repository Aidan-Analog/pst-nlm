import Foundation

@MainActor
final class ListingsService {
    static let shared = ListingsService()

    // ── Replace with your deployed Vercel URL ──────────────────────────────
    // For local testing with `vercel dev` use: "http://localhost:3000/api/listings"
    private let baseURL = "https://YOUR_PROJECT.vercel.app/api/listings"

    private let session: URLSession = {
        let cfg = URLSessionConfiguration.default
        cfg.timeoutIntervalForRequest  = 30
        cfg.timeoutIntervalForResource = 60
        return URLSession(configuration: cfg)
    }()

    private let decoder: JSONDecoder = {
        let d = JSONDecoder()
        d.keyDecodingStrategy = .convertFromSnakeCase
        return d
    }()

    func fetchListings(date: String = "today") async throws -> ListingsResponse {
        let url = try buildURL(params: ["date": date])
        return try await fetch(url)
    }

    func fetchChannel(slug: String, date: String = "today") async throws -> Channel {
        let url = try buildURL(params: ["channel": slug, "date": date])
        let response: ListingsResponse = try await fetch(url)
        guard let channel = response.channels.first else {
            throw URLError(.cannotParseResponse)
        }
        return channel
    }

    // ── Private helpers ────────────────────────────────────────────────────

    private func buildURL(params: [String: String]) throws -> URL {
        var comps = URLComponents(string: baseURL)
        comps?.queryItems = params.map { URLQueryItem(name: $0.key, value: $0.value) }
        guard let url = comps?.url else { throw URLError(.badURL) }
        return url
    }

    private func fetch<T: Decodable>(_ url: URL) async throws -> T {
        let (data, response) = try await session.data(from: url)
        guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
            throw URLError(.badServerResponse)
        }
        return try decoder.decode(T.self, from: data)
    }
}
