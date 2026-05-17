import Foundation

struct Channel: Identifiable, Hashable {
    let id: String          // = slug
    let slug: String
    let name: String
    let programs: [Program]

    var nowPlaying: Program? {
        programs.first(where: { $0.isNow }) ?? programs.first(where: { $0.isCurrentlyAiring })
    }

    var upNext: Program? {
        guard let now = nowPlaying,
              let idx = programs.firstIndex(of: now),
              idx + 1 < programs.count
        else { return nil }
        return programs[idx + 1]
    }
}

extension Channel: Codable {
    enum CodingKeys: String, CodingKey {
        case slug, name, programs
    }

    init(from decoder: any Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        slug     = try c.decode(String.self,    forKey: .slug)
        name     = try c.decode(String.self,    forKey: .name)
        programs = try c.decode([Program].self, forKey: .programs)
        id       = slug
    }

    func encode(to encoder: any Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(slug,     forKey: .slug)
        try c.encode(name,     forKey: .name)
        try c.encode(programs, forKey: .programs)
    }
}
