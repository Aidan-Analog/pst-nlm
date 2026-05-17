import Foundation

struct Program: Codable, Identifiable, Hashable {
    let id: String
    let title: String
    let startTime: String       // "HH:MM" 24-hour
    let endTime: String
    let durationMinutes: Int?
    let description: String
    let isNow: Bool
    let genre: String

    /// True if the programme is currently airing according to the device clock.
    /// Used as a fallback when `isNow` from the API may be stale.
    var isCurrentlyAiring: Bool {
        guard !startTime.isEmpty, !endTime.isEmpty else { return false }
        let comps = Calendar.current.dateComponents([.hour, .minute], from: Date())
        guard let h = comps.hour, let m = comps.minute else { return false }
        let nowMins = h * 60 + m
        func parse(_ t: String) -> Int? {
            let parts = t.split(separator: ":").compactMap { Int($0) }
            return parts.count == 2 ? parts[0] * 60 + parts[1] : nil
        }
        guard let start = parse(startTime), let end = parse(endTime) else { return false }
        // Handle overnight wrap (e.g. 23:30 – 00:30)
        if end < start {
            return nowMins >= start || nowMins < end
        }
        return nowMins >= start && nowMins < end
    }

    var isOnNow: Bool { isNow || isCurrentlyAiring }
}
