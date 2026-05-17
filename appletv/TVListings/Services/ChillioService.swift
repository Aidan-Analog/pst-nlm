import Foundation
import UIKit

enum ChillioStrategy: String {
    case directChannelId  = "chillio://channel/{id}"
    case playByName       = "chillio://play?name={name}"
    case universalLink    = "https://chillio.app/open"
    case chillLink        = "https://link.chillio.app/channel/{id}"
    case clipboardFallback = "clipboard"
}

@MainActor
final class ChillioService {
    static let shared = ChillioService()

    private lazy var channelMap: [String: String] = {
        guard let url  = Bundle.main.url(forResource: "channels", withExtension: "json"),
              let data = try? Data(contentsOf: url),
              let map  = try? JSONDecoder().decode([String: String].self, from: data)
        else { return [:] }
        return map
    }()

    /// Attempts to open the channel in Chillio. Returns the strategy that succeeded.
    /// On `.clipboardFallback`, the channel name has been copied to the clipboard.
    @discardableResult
    func openChannel(slug: String) async -> ChillioStrategy {
        let chillioId   = channelMap[slug] ?? slug
        let channelName = channelMap[slug] ?? slug

        let candidates: [(ChillioStrategy, URL?)] = [
            (.directChannelId, URL(string: "chillio://channel/\(chillioId.urlEncoded)")),
            (.playByName,      URL(string: "chillio://play?name=\(channelName.urlEncoded)")),
            (.universalLink,   URL(string: "https://chillio.app/open?channel=\(channelName.urlEncoded)")),
            (.chillLink,       URL(string: "https://link.chillio.app/channel/\(chillioId.urlEncoded)")),
        ]

        for (strategy, candidateURL) in candidates {
            guard let url = candidateURL else { continue }
            if UIApplication.shared.canOpenURL(url) {
                let opened = await UIApplication.shared.open(url)
                if opened { return strategy }
            }
        }

        // Clipboard fallback — always succeeds
        UIPasteboard.general.string = channelName
        return .clipboardFallback
    }
}

private extension String {
    var urlEncoded: String {
        addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? self
    }
}
