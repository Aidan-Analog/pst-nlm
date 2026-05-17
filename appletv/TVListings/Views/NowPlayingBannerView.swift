import SwiftUI

struct NowPlayingBannerView: View {
    @Environment(ListingsViewModel.self) private var vm

    var body: some View {
        if let channel = vm.selectedChannel, let now = channel.nowPlaying {
            HStack(spacing: 32) {
                VStack(alignment: .leading, spacing: 6) {
                    Label("On Now", systemImage: "antenna.radiowaves.left.and.right")
                        .font(.caption.bold())
                        .foregroundStyle(.red)

                    Text(now.title)
                        .font(.title3.bold())
                        .lineLimit(1)

                    HStack(spacing: 12) {
                        Text("\(now.startTime) – \(now.endTime)")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)

                        if let dur = now.durationMinutes {
                            Text("·  \(dur) min")
                                .font(.subheadline)
                                .foregroundStyle(.tertiary)
                        }

                        if !now.genre.isEmpty {
                            Text(now.genre)
                                .font(.caption)
                                .padding(.horizontal, 10)
                                .padding(.vertical, 3)
                                .background(Capsule().strokeBorder(.secondary.opacity(0.5)))
                        }
                    }
                }

                Spacer()

                Button {
                    Task { await vm.playChannel(channel) }
                } label: {
                    Label("Watch on Chillio", systemImage: "play.circle.fill")
                        .font(.headline)
                }
                .buttonStyle(.card)
            }
            .padding(.horizontal, 48)
            .padding(.vertical, 20)
            .background(.ultraThinMaterial)
        }
    }
}
