import SwiftUI

@main
struct TVListingsApp: App {
    @State private var viewModel = ListingsViewModel()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(viewModel)
                .task { await viewModel.loadListings() }
        }
    }
}
