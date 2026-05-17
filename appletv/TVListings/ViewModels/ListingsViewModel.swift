import Foundation
import Observation

@Observable
final class ListingsViewModel {
    var channels: [Channel] = []
    var selectedChannel: Channel?
    var selectedProgram: Program?
    var isLoading = false
    var errorMessage: String?

    // Chillio fallback alert
    var showChillioFallback = false
    var fallbackChannelName = ""

    private let listings = ListingsService.shared
    private let chillio  = ChillioService.shared

    func loadListings(date: String = "today") async {
        isLoading    = true
        errorMessage = nil
        do {
            let response  = try await listings.fetchListings(date: date)
            channels      = response.channels
            // Auto-select first channel if nothing is selected
            if selectedChannel == nil {
                selectedChannel = channels.first
            }
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    func selectChannel(_ channel: Channel) {
        selectedChannel = channel
        selectedProgram = nil
    }

    func selectProgram(_ program: Program) {
        selectedProgram = program
    }

    func dismissDetail() {
        selectedProgram = nil
    }

    func playChannel(_ channel: Channel) async {
        let strategy = await chillio.openChannel(slug: channel.slug)
        if strategy == .clipboardFallback {
            fallbackChannelName = channel.name
            showChillioFallback = true
        }
    }

    func playCurrentChannel() async {
        guard let ch = selectedChannel else { return }
        await playChannel(ch)
    }

    /// Silently refresh the selected channel's programme list in the background.
    func refreshSelectedChannel() async {
        guard let slug = selectedChannel?.slug else { return }
        guard let updated = try? await listings.fetchChannel(slug: slug) else { return }
        if let idx = channels.firstIndex(where: { $0.slug == slug }) {
            channels[idx] = updated
            // Keep selectedChannel in sync
            if selectedChannel?.slug == slug {
                selectedChannel = updated
            }
        }
    }
}
