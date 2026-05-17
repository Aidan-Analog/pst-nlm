# Irish TV Listings — tvOS App Setup

## Prerequisites

- Xcode 15+ with tvOS 17 SDK
- An Apple Developer account (for physical Apple TV testing)
- The Vercel API deployed (see `../api/listings.ts`)

## Creating the Xcode Project

The Swift source files in `TVListings/` are ready to use. Create the Xcode project wrapper:

1. Open **Xcode** → File → New → Project
2. Select platform **tvOS**, template **App**
3. Fill in:
   - Product Name: `TVListings`
   - Bundle Identifier: `com.yourcompany.tvlistings`
   - Interface: **SwiftUI**
   - Language: **Swift**
   - Minimum Deployment: **tvOS 17.0**
4. Save to this `appletv/` directory — uncheck "Create Git repository"
5. **Replace** the generated Swift files with the ones in `TVListings/`
6. Add `channels.json` to the target with the "Copy Bundle Resources" build phase
7. Replace `Info.plist` with the one from `TVListings/Info.plist`

## Configure the API URL

Open `TVListings/Services/ListingsService.swift` and update:

```swift
private let baseURL = "https://YOUR_PROJECT.vercel.app/api/listings"
```

For local development with `vercel dev`:

```swift
private let baseURL = "http://localhost:3000/api/listings"
```

## Build & Run

### Simulator
- Select **Apple TV 4K (3rd generation)** simulator
- Product → Run (⌘R)
- Use arrow keys for D-pad navigation, Return for Select, Space for Play/Pause

### Physical Apple TV 4K
- Connect Apple TV via USB-C or use wireless pairing (Xcode → Window → Devices)
- Select your device and run

## Chillio Deep Link Discovery

The app tries these URL schemes in order:

1. `chillio://channel/{id}`
2. `chillio://play?name={name}`
3. `https://chillio.app/open?channel={name}`
4. `https://link.chillio.app/channel/{id}`
5. Clipboard fallback

To find the correct Chillio URL scheme, extract the IPA from a device:
```bash
unzip Chillio.ipa
plutil -p Payload/Chillio.app/Info.plist | grep -A 10 CFBundleURLSchemes
```

Update `channels.json` with the confirmed Chillio channel identifiers once discovered.
