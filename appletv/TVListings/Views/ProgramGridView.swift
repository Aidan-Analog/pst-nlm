import SwiftUI

struct ProgramGridView: View {
    @Environment(ListingsViewModel.self) private var vm
    @FocusState private var focusedId: String?

    var body: some View {
        ScrollViewReader { proxy in
            ScrollView(.vertical, showsIndicators: false) {
                LazyVStack(spacing: 6, pinnedViews: [.sectionHeaders]) {
                    if let channel = vm.selectedChannel {
                        Section {
                            ForEach(channel.programs) { program in
                                ProgramRowView(
                                    program: program,
                                    isFocused: focusedId == program.id
                                )
                                .id(program.id)
                                .focusable()
                                .focused($focusedId, equals: program.id)
                                .onTapGesture { vm.selectProgram(program) }
                                .onPlayPauseCommand { Task { await vm.playChannel(channel) } }
                            }
                        } header: {
                            Text(channel.name)
                                .font(.title3.bold())
                                .padding(.horizontal, 40)
                                .padding(.vertical, 10)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .background(.thickMaterial)
                        }
                    } else {
                        ContentUnavailableView(
                            "Select a Channel",
                            systemImage: "tv",
                            description: Text("Choose a channel from the sidebar to see its listings.")
                        )
                        .padding(.top, 120)
                    }
                }
                .padding(.horizontal, 24)
                .padding(.bottom, 40)
            }
            .onAppear { scrollToNow(proxy: proxy) }
            .onChange(of: vm.selectedChannel) { _, _ in
                withAnimation(.easeInOut(duration: 0.3)) { scrollToNow(proxy: proxy) }
            }
        }
    }

    private func scrollToNow(proxy: ScrollViewProxy) {
        if let nowId = vm.selectedChannel?.nowPlaying?.id {
            proxy.scrollTo(nowId, anchor: .top)
            focusedId = nowId
        }
    }
}

private struct ProgramRowView: View {
    let program: Program
    let isFocused: Bool

    var body: some View {
        HStack(alignment: .top, spacing: 28) {
            // Fixed-width time column
            VStack(alignment: .trailing, spacing: 3) {
                Text(program.startTime)
                    .font(.headline.monospacedDigit())
                if !program.endTime.isEmpty {
                    Text(program.endTime)
                        .font(.caption.monospacedDigit())
                        .foregroundStyle(.tertiary)
                }
            }
            .frame(width: 72, alignment: .trailing)

            // Programme details
            VStack(alignment: .leading, spacing: 6) {
                HStack(spacing: 10) {
                    if program.isOnNow {
                        Label("Now", systemImage: "play.fill")
                            .font(.caption2.bold())
                            .foregroundStyle(.white)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 3)
                            .background(Capsule().fill(.red))
                    }
                    Text(program.title)
                        .font(.headline)
                        .lineLimit(2)
                }

                if !program.description.isEmpty {
                    Text(program.description)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .lineLimit(2)
                }

                HStack(spacing: 12) {
                    if let dur = program.durationMinutes {
                        Text("\(dur) min")
                            .font(.caption2)
                            .foregroundStyle(.tertiary)
                    }
                    if !program.genre.isEmpty {
                        Text(program.genre)
                            .font(.caption2)
                            .foregroundStyle(.tertiary)
                    }
                }
            }

            Spacer()
        }
        .padding(.vertical, 14)
        .padding(.horizontal, 20)
        .background(
            RoundedRectangle(cornerRadius: 14)
                .fill(isFocused ? Color.white.opacity(0.12) : Color.clear)
                .overlay(
                    RoundedRectangle(cornerRadius: 14)
                        .strokeBorder(isFocused ? Color.white.opacity(0.25) : Color.clear)
                )
        )
        .scaleEffect(isFocused ? 1.015 : 1.0)
        .animation(.easeInOut(duration: 0.12), value: isFocused)
    }
}
