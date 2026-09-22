import Foundation

/// A value of a component spec, in the subset of YAML `spec/components/*.yaml` is written in.
///
/// The Apple tests read the specs from the checkout (`DSComponentsContractTests.repository`), and the package has no
/// YAML dependency — `Package.swift` takes one test-only package, the snapshot renderer — so the subset is parsed
/// here. It is a subset with a checked boundary, not a guess: `DSSpecYAMLTests.everySpecInTheRepositoryParses`
/// parses every file under `spec/` and every form the corpus contains (block mappings and sequences, flow mappings
/// and sequences, quoted keys and values, folded and literal block scalars), and anything else is an error with a
/// line number rather than a value nobody wrote.
nonisolated indirect enum DSSpecValue: Equatable, Sendable {
    case scalar(String)
    case list([DSSpecValue])
    case map(DSSpecMapping)
    /// A key with nothing under it (`notes:` at the end of a file).
    case null

    var stringValue: String? { if case .scalar(let value) = self { value } else { nil } }
    var listValue: [DSSpecValue]? { if case .list(let items) = self { items } else { nil } }
    var mapValue: DSSpecMapping? { if case .map(let mapping) = self { mapping } else { nil } }

    /// The value at a key of a mapping; nil for any other value, and for a key that is not there.
    subscript(_ key: String) -> DSSpecValue? { mapValue?[key] }

    /// The value at a dotted path: `tokens.root.background`. A step that is not there returns nil.
    func at(_ path: String) -> DSSpecValue? {
        var current: DSSpecValue? = self
        for step in path.split(separator: ".") {
            current = current?[String(step)]
            if current == nil { return nil }
        }
        return current
    }
}

/// A mapping that remembers the order its keys were written in, so a reader can say which keys a matrix has and a
/// failure can list them the way the file does. Duplicate keys are a syntax error, as they are for the TypeScript
/// loader (`tools/spec/load.ts` parses with `uniqueKeys: true`).
nonisolated struct DSSpecMapping: Equatable, Sendable {
    private(set) var keys: [String] = []
    private var storage: [String: DSSpecValue] = [:]

    subscript(_ key: String) -> DSSpecValue? { storage[key] }

    var isEmpty: Bool { keys.isEmpty }

    mutating func insert(_ key: String, _ value: DSSpecValue, line: Int) throws {
        guard storage[key] == nil else { throw DSSpecSyntax(line: line, message: "the key \(key) is written twice") }
        keys.append(key)
        storage[key] = value
    }

    /// Every pair, in document order.
    var pairs: [(key: String, value: DSSpecValue)] { keys.map { ($0, storage[$0] ?? .null) } }
}

nonisolated struct DSSpecSyntax: Error, CustomStringConvertible, Equatable {
    let line: Int
    let message: String
    var description: String { "line \(line): \(message)" }
}

/// The parser. It reads a whole document, because a reader that reads only the block it needs is a reader that has
/// to be extended again for the next block — which is how this target came to have five regular expressions over
/// one file.
///
/// What it deliberately does not read, because `spec/` contains none of it and a silent misreading is worse than a
/// line number: anchors and aliases, tags, multi-document files, tab indentation, a plain scalar continued on the
/// next line, and a sequence written at its key's own indentation (every sequence in `spec/` is indented under its
/// key). `spec:validate` and `tools/spec/load.ts` — the `yaml` package — remain the authority on the files; this is
/// the reader the Apple tests carry.
nonisolated enum DSSpecYAML {
    private struct Line {
        let number: Int
        let indent: Int
        /// The line without its indentation and without trailing spaces; `""` for a blank line.
        let text: String
        var isBlank: Bool { text.isEmpty }
    }

    static func parse(_ text: String) throws -> DSSpecValue {
        let lines = split(text)
        // YAML forbids a tab in indentation, and a reader that counted one as nothing would read the line into the
        // wrong block; `\t` inside a scalar is a character like any other and is not looked at here.
        if let tabbed = lines.first(where: { $0.text.hasPrefix("\t") }) {
            throw DSSpecSyntax(line: tabbed.number, message: "indentation is a tab")
        }
        var index = 0
        let value = try parseBlock(lines, &index, indent: firstIndent(lines))
        skipBlanks(lines, &index)
        if index < lines.count {
            throw DSSpecSyntax(line: lines[index].number, message: "this line is indented less than the block it is in")
        }
        return value
    }

    // MARK: - Lines

    private static func split(_ text: String) -> [Line] {
        text.split(separator: "\n", omittingEmptySubsequences: false).enumerated().map { offset, raw in
            let body = raw.hasSuffix("\r") ? raw.dropLast() : raw
            let trimmed = body.drop(while: { $0 == " " })
            let indent = body.count - trimmed.count
            let text = String(trimmed).replacing(/[ \t]+$/, with: "")
            return Line(number: offset + 1, indent: text.isEmpty ? 0 : indent, text: text)
        }
    }

    private static func firstIndent(_ lines: [Line]) -> Int {
        lines.first(where: { !$0.isBlank })?.indent ?? 0
    }

    private static func skipBlanks(_ lines: [Line], _ index: inout Int) {
        while index < lines.count, lines[index].isBlank { index += 1 }
    }

    // MARK: - Blocks

    private static func parseBlock(_ lines: [Line], _ index: inout Int, indent: Int) throws -> DSSpecValue {
        skipBlanks(lines, &index)
        guard index < lines.count, lines[index].indent >= indent else { return .null }
        if isSequenceItem(lines[index].text) { return try parseSequence(lines, &index, indent: indent) }
        return try parseMapping(lines, &index, indent: indent)
    }

    private static func isSequenceItem(_ text: String) -> Bool {
        text == "-" || text.hasPrefix("- ")
    }

    private static func parseMapping(_ lines: [Line], _ index: inout Int, indent: Int) throws -> DSSpecValue {
        var mapping = DSSpecMapping()
        while true {
            skipBlanks(lines, &index)
            guard index < lines.count else { break }
            let line = lines[index]
            if line.indent < indent { break }
            if line.indent > indent {
                throw DSSpecSyntax(line: line.number, message: "this line is indented past the mapping it is in")
            }
            guard let (key, rest) = splitKey(line.text, at: line.number) else {
                throw DSSpecSyntax(line: line.number, message: "expected `key: value`, found \(line.text)")
            }
            index += 1
            let value = try parseValue(rest, lines, &index, parent: line, keyIndent: indent)
            try mapping.insert(key, value, line: line.number)
        }
        return .map(mapping)
    }

    private static func parseSequence(_ lines: [Line], _ index: inout Int, indent: Int) throws -> DSSpecValue {
        var items: [DSSpecValue] = []
        while true {
            skipBlanks(lines, &index)
            guard index < lines.count else { break }
            let line = lines[index]
            if line.indent < indent { break }
            if line.indent > indent || !isSequenceItem(line.text) {
                throw DSSpecSyntax(line: line.number, message: "expected a `- ` item of the sequence, found \(line.text)")
            }
            let rest = String(line.text.dropFirst(1).drop(while: { $0 == " " }))
            let contentIndent = indent + line.text.count - rest.count
            index += 1
            // The item's own lines: what follows the dash on its line, then every deeper line under it.
            var itemLines: [Line] = rest.isEmpty ? [] : [Line(number: line.number, indent: contentIndent, text: rest)]
            while index < lines.count, lines[index].isBlank || lines[index].indent > indent {
                itemLines.append(lines[index])
                index += 1
            }
            var itemIndex = 0
            let item: DSSpecValue
            if !rest.isEmpty, splitKey(rest, at: line.number) == nil {
                // A scalar or flow item (`- "Labels never wrap…"`, `- [a, b]`): the dash line is the whole value.
                itemIndex = 1
                item = try parseValue(rest, itemLines, &itemIndex, parent: line, keyIndent: contentIndent)
            } else {
                item = try parseBlock(itemLines, &itemIndex, indent: contentIndent)
            }
            skipBlanks(itemLines, &itemIndex)
            if itemIndex < itemLines.count {
                throw DSSpecSyntax(line: itemLines[itemIndex].number, message: "this line is indented less than the item it is in")
            }
            items.append(item)
        }
        return .list(items)
    }

    /// The value a `key:` line carries: on the line itself, or in the block under it.
    private static func parseValue(_ rest: String, _ lines: [Line], _ index: inout Int, parent: Line, keyIndent: Int) throws -> DSSpecValue {
        if rest.isEmpty {
            skipBlanks(lines, &index)
            guard index < lines.count, lines[index].indent > keyIndent else { return .null }
            return try parseBlock(lines, &index, indent: lines[index].indent)
        }
        if rest.hasPrefix("{") || rest.hasPrefix("[") {
            let characters = Array(rest)
            var position = 0
            let value = try parseFlow(characters, &position, line: parent.number)
            skipSpaces(characters, &position)
            guard position == characters.count else {
                throw DSSpecSyntax(line: parent.number, message: "trailing text after the flow collection")
            }
            return value
        }
        if rest.hasPrefix(">") || rest.hasPrefix("|") {
            return .scalar(try parseBlockScalar(rest, lines, &index, parent: parent, keyIndent: keyIndent))
        }
        return .scalar(try unquote(rest, line: parent.number))
    }

    /// A folded (`>`) or literal (`|`) scalar. The chomping indicator is read and only `+` changes the result here:
    /// nothing in `spec/` ends a block scalar with a blank line, and a trailing newline is never part of a value the
    /// tests compare.
    private static func parseBlockScalar(_ header: String, _ lines: [Line], _ index: inout Int, parent: Line, keyIndent: Int) throws -> String {
        let folded = header.hasPrefix(">")
        guard header.dropFirst().allSatisfy({ $0 == "-" || $0 == "+" }) else {
            throw DSSpecSyntax(line: parent.number, message: "an explicit indentation indicator is not read here: \(header)")
        }
        var body: [Line] = []
        while index < lines.count, lines[index].isBlank || lines[index].indent > keyIndent {
            body.append(lines[index])
            index += 1
        }
        while body.last?.isBlank == true { body.removeLast() }
        let bodyIndent = body.first(where: { !$0.isBlank })?.indent ?? 0
        let texts = body.map { $0.isBlank ? "" : String(repeating: " ", count: max(0, $0.indent - bodyIndent)) + $0.text }
        guard folded else { return texts.joined(separator: "\n") }
        // Folded: lines of a paragraph join with a space, a blank line is a paragraph break.
        var paragraphs: [String] = []
        var current: [String] = []
        for text in texts {
            if text.isEmpty {
                paragraphs.append(current.joined(separator: " "))
                current = []
            } else {
                current.append(text)
            }
        }
        paragraphs.append(current.joined(separator: " "))
        return paragraphs.joined(separator: "\n")
    }

    // MARK: - Scalars

    /// `key: rest` split at the first colon outside quotes; nil when the line is not a `key:` line at all.
    private static func splitKey(_ text: String, at line: Int) -> (key: String, rest: String)? {
        var quote: Character?
        let characters = Array(text)
        var position = 0
        while position < characters.count {
            let character = characters[position]
            if let open = quote {
                if character == open { quote = nil }
            } else if character == "\"" || character == "'" {
                quote = character
            } else if character == ":" {
                let next = position + 1 < characters.count ? characters[position + 1] : " "
                guard next == " " || position + 1 == characters.count else {
                    position += 1
                    continue
                }
                let key = String(characters[0..<position])
                let rest = String(characters[min(position + 1, characters.count)...]).drop(while: { $0 == " " })
                guard let unquoted = try? unquote(key, line: line), !unquoted.isEmpty else { return nil }
                return (unquoted, String(rest))
            }
            position += 1
        }
        return nil
    }

    /// A scalar as written: a quoted string with its escapes resolved, or a plain scalar up to a ` #` comment.
    private static func unquote(_ raw: String, line: Int) throws -> String {
        let characters = Array(raw)
        var position = 0
        let value = try parseScalar(characters, &position, line: line, stops: [])
        skipSpaces(characters, &position)
        // What is left is a comment, or nothing. A plain scalar stops at its own ` #`; a quoted one stops at its
        // closing quote, and anything after it that is not a comment is text nobody meant to write.
        guard position == characters.count || characters[position] == "#" else {
            throw DSSpecSyntax(line: line, message: "trailing text after the scalar")
        }
        return value
    }

    private static func skipSpaces(_ characters: [Character], _ position: inout Int) {
        while position < characters.count, characters[position] == " " { position += 1 }
    }

    private static func parseScalar(_ characters: [Character], _ position: inout Int, line: Int, stops: Set<Character>) throws -> String {
        skipSpaces(characters, &position)
        guard position < characters.count else { return "" }
        let first = characters[position]
        if first == "\"" || first == "'" {
            position += 1
            var value = ""
            while position < characters.count {
                let character = characters[position]
                if character == first {
                    if first == "'", position + 1 < characters.count, characters[position + 1] == "'" {
                        value.append("'")
                        position += 2
                        continue
                    }
                    position += 1
                    return value
                }
                if first == "\"", character == "\\", position + 1 < characters.count {
                    let escaped = characters[position + 1]
                    switch escaped {
                    case "n": value.append("\n")
                    case "t": value.append("\t")
                    case "\\": value.append("\\")
                    case "\"": value.append("\"")
                    case "/": value.append("/")
                    default:
                        throw DSSpecSyntax(line: line, message: "the escape \\\(escaped) is not read here")
                    }
                    position += 2
                    continue
                }
                value.append(character)
                position += 1
            }
            throw DSSpecSyntax(line: line, message: "a quoted scalar is not closed")
        }
        var value = ""
        while position < characters.count, !stops.contains(characters[position]) {
            // A `#` after a space starts a comment, as it does in YAML.
            if characters[position] == "#", value.hasSuffix(" ") || value.isEmpty { break }
            value.append(characters[position])
            position += 1
        }
        return value.replacing(/[ \t]+$/, with: "")
    }

    // MARK: - Flow collections

    private static func parseFlow(_ characters: [Character], _ position: inout Int, line: Int) throws -> DSSpecValue {
        skipSpaces(characters, &position)
        guard position < characters.count else { return .null }
        switch characters[position] {
        case "{":
            position += 1
            var mapping = DSSpecMapping()
            while true {
                skipSpaces(characters, &position)
                guard position < characters.count else { throw DSSpecSyntax(line: line, message: "a flow mapping is not closed") }
                if characters[position] == "}" {
                    position += 1
                    return .map(mapping)
                }
                let key = try parseScalar(characters, &position, line: line, stops: [":", ",", "}"])
                skipSpaces(characters, &position)
                guard position < characters.count, characters[position] == ":" else {
                    throw DSSpecSyntax(line: line, message: "expected `:` after the flow key \(key)")
                }
                position += 1
                let value = try parseFlow(characters, &position, line: line)
                try mapping.insert(key, value, line: line)
                skipSpaces(characters, &position)
                if position < characters.count, characters[position] == "," { position += 1 }
            }
        case "[":
            position += 1
            var items: [DSSpecValue] = []
            while true {
                skipSpaces(characters, &position)
                guard position < characters.count else { throw DSSpecSyntax(line: line, message: "a flow sequence is not closed") }
                if characters[position] == "]" {
                    position += 1
                    return .list(items)
                }
                items.append(try parseFlow(characters, &position, line: line))
                skipSpaces(characters, &position)
                if position < characters.count, characters[position] == "," { position += 1 }
            }
        default:
            let value = try parseScalar(characters, &position, line: line, stops: [",", "}", "]"])
            return .scalar(value)
        }
    }
}
