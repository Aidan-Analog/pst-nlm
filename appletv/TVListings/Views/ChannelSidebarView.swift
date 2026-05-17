import SwiftUI

struct ChannelSidebarView: View {
    @Environment(ListingsViewModel.self) private var vm
    @FocusState private var focusedId: String?

    var body: some View {
        List(vm.channels) { channel in
            ChannelRowView(
                channel: channel,
                isSelected: vm.selectedChannel?.id == channel.id,
                isFocused: focusedId == channel.id
            )
            .focusable()
            .focused($focusedId, equals: channel.id)
            .onTapGesture { vm.selectChannel(channel) }
            .onPlayPauseCommand { Task { await vm.playChannel(channel) } }
        }
        .listStyle(.sidebar)
        .navigationTitle("Irish TV")
        .onChange(of: focusedId) { _, newId in
            if let id = newId, let ch = vm.channels.first(where: { $0.id == id }) {
                vm.selectChannel(ch)
            }
        }
    }
}

private struct ChannelRowView: View {
    let channel: Channel
    let isSelected: Bool
    let isFocused: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 5) {
            Text(channel.name)
                .font(.headline)
                .foregroundStyle(isFocused || isSelected ? .primary : .secondary)

            if let now = channel.nowPlaying {
                Text(now.title)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            } else {
                Text("No listing available")
                    .font(.caption)
                    .foregroundStyle(.tertiary)
            }
        }
        .padding(.vertical, 4)
    }
}
