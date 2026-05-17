import SwiftUI

struct ContentView: View {
    @Environment(ListingsViewModel.self) private var vm

    var body: some View {
        Group {
            if vm.isLoading {
                LoadingView()
            } else if let error = vm.errorMessage {
                ErrorView(message: error) {
                    Task { await vm.loadListings() }
                }
            } else {
                mainLayout
            }
        }
        // Programme detail sheet
        .sheet(isPresented: Binding(
            get: { vm.selectedProgram != nil },
            set: { if !$0 { vm.dismissDetail() } }
        )) {
            if let program = vm.selectedProgram, let channel = vm.selectedChannel {
                ProgramDetailView(program: program, channel: channel)
                    .environment(vm)
            }
        }
        // Chillio fallback alert
        .alert("Open in Chillio", isPresented: Binding(
            get: { vm.showChillioFallback },
            set: { vm.showChillioFallback = $0 }
        )) {
            Button("OK") { vm.showChillioFallback = false }
        } message: {
            Text("""
                Chillio couldn't be opened automatically. \
                The channel "\(vm.fallbackChannelName)" has been copied to your clipboard. \
                Open Chillio and search for it there.
                """)
        }
    }

    private var mainLayout: some View {
        NavigationSplitView {
            ChannelSidebarView()
                .focusSection()
        } detail: {
            VStack(spacing: 0) {
                NowPlayingBannerView()
                Divider().opacity(0.3)
                ProgramGridView()
                    .focusSection()
            }
        }
        .navigationSplitViewStyle(.balanced)
    }
}
