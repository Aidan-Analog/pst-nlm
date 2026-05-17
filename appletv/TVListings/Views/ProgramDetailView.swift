import SwiftUI

struct ProgramDetailView: View {
    let program: Program
    let channel: Channel

    @Environment(ListingsViewModel.self) private var vm
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ZStack(alignment: .topLeading) {
            // Background gradient
            LinearGradient(
                colors: [Color.black.opacity(0.8), Color.clear],
                startPoint: .leading,
                endPoint: .trailing
            )
            .ignoresSafeArea()

            VStack(alignment: .leading, spacing: 28) {
                // Channel + time
                HStack(spacing: 16) {
                    Text(channel.name)
                        .font(.headline)
                        .foregroundStyle(.secondary)

                    if !program.startTime.isEmpty {
                        Text("·")
                            .foregroundStyle(.tertiary)
                        Text(program.endTime.isEmpty
                             ? program.startTime
                             : "\(program.startTime) – \(program.endTime)")
                            .font(.headline)
                            .foregroundStyle(.secondary)
                    }

                    if let dur = program.durationMinutes {
                        Text("(\(dur) min)")
                            .font(.subheadline)
                            .foregroundStyle(.tertiary)
                    }
                }

                // Title
                Text(program.title)
                    .font(.largeTitle.bold())
                    .lineLimit(3)

                // Genre badge
                if !program.genre.isEmpty {
                    Text(program.genre)
                        .font(.subheadline)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 6)
                        .background(Capsule().strokeBorder(.secondary.opacity(0.6)))
                }

                // Description
                if !program.description.isEmpty {
                    Text(program.description)
                        .font(.body)
                        .foregroundStyle(.secondary)
                        .lineLimit(8)
                        .frame(maxWidth: 800, alignment: .leading)
                }

                Spacer(minLength: 0)

                // Action buttons
                HStack(spacing: 24) {
                    Button {
                        dismiss()
                        Task { await vm.playChannel(channel) }
                    } label: {
                        Label("Watch Live on Chillio", systemImage: "play.circle.fill")
                            .font(.headline)
                    }
                    .buttonStyle(.card)

                    Button("Dismiss") { dismiss() }
                        .buttonStyle(.plain)
                        .foregroundStyle(.secondary)
                }
            }
            .padding(60)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
}
