// The end-of-workout post-mortem: PRs at the summit, then slots, per-exercise
// verdicts, session vitals, and weekly frequency — a persistent artefact
// reachable again from history, not an ephemeral congratulation.
//
// Layer rules (Theme.swift / ios/CLAUDE.md): one ScrollView of CONTENT — system
// materials only, NEVER .glassEffect in the scroll body. The nav bar is
// automatic glass. Section scaffolding is stable: every section renders its
// header with a filled-or-placeholder body. Green = PR only; amber = accent.

import SwiftUI
import Charts

enum PostMortemMode { case review, history }

struct PostMortemView: View {
    @Environment(AppState.self) private var appState
    let sessionId: Int64
    let mode: PostMortemMode

    @State private var pm: PostMortem?
    @State private var loadError: String?

    var body: some View {
        Group {
            if let pm {
                content(pm)
            } else if let loadError {
                ContentUnavailableView("Couldn't load summary",
                    systemImage: "exclamationmark.triangle", description: Text(loadError))
            } else {
                ProgressView()
            }
        }
        .navigationTitle((pm?.title ?? "Summary").uppercased())
        .navigationSubtitle(subtitle)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            if mode == .review {
                ToolbarItem(placement: .confirmationAction) {
                    // .confirmationAction auto-applies .glassProminent (glass guide).
                    Button("Done") { appState.workoutPresented = false }
                }
            }
        }
        .task {
            do { pm = try PostMortem.build(sessionId: sessionId, db: appState.db) }
            catch { loadError = error.localizedDescription }
        }
    }

    private var subtitle: String {
        guard let pm else { return "" }
        return [pm.dayLabel, pm.durationLabel].compactMap { $0 }.joined(separator: " · ")
    }

    private func content(_ pm: PostMortem) -> some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Theme.grid * 8) {
                prsSection(pm)
                slotsSection(pm)
                exercisesSection(pm)
                vitalsSection(pm)
                frequencySection(pm)
            }
            .padding(.horizontal, Theme.margin)
            .padding(.vertical, Theme.grid * 3)
        }
        .background(Color(.systemBackground))
    }

    // ── §A PRs (summit) ──

    @ViewBuilder
    private func prsSection(_ pm: PostMortem) -> some View {
        VStack(alignment: .leading, spacing: Theme.grid * 4) {
            sectionHeader("PRs")
            if pm.prs.isEmpty {
                if !pm.outcomes.isEmpty, pm.outcomes.allSatisfy({ $0.verdict == .firstTime }) {
                    placeholder("No PRs yet — first time on record")
                } else {
                    VStack(alignment: .leading, spacing: Theme.grid) {
                        Text("No PRs today").font(Theme.data)
                        Text("Steady work — \(pm.slotsBeaten) slots beaten")
                            .font(Theme.body).foregroundStyle(.secondary)
                    }
                }
            } else {
                // Cap sparklines at the top 3 PRs by e1RM gain (rest list as
                // text rows) so the summit stays one scroll, not a chart wall.
                ForEach(Array(pm.prs.enumerated()), id: \.element.id) { index, pr in
                    prCard(pr, chartsAllowed: index < 3)
                }
            }
        }
    }

    @ViewBuilder
    private func prCard(_ pr: PostMortem.ExerciseOutcome, chartsAllowed: Bool) -> some View {
        VStack(alignment: .leading, spacing: Theme.grid * 2) {
            Text(pr.name.uppercased())
                .font(Theme.exerciseTitle)
                .lineLimit(1).minimumScaleFactor(0.7)

            if pr.isBodyweight {
                prValueLine(value: "\(pr.bestReps) reps", evidence: "bodyweight")
            } else if let best = pr.sessionBestE1rm {
                prValueLine(value: "e1RM \(oneDecimal(best))", evidence: evidenceLabel(pr.prSet))
                sparkline(pr, chartsAllowed: chartsAllowed)
            }
        }
        .padding(Theme.margin)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: Theme.cardRadius))
    }

    private func prValueLine(value: String, evidence: String?) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: Theme.grid * 2) {
            Text(value).font(Theme.titleData).foregroundStyle(Theme.green)
            Text("new best").metaLabel().foregroundStyle(Theme.green)
            Spacer()
            if let evidence {
                Text(evidence).font(Theme.data).foregroundStyle(.secondary)
            }
        }
    }

    @ViewBuilder
    private func sparkline(_ pr: PostMortem.ExerciseOutcome, chartsAllowed: Bool) -> some View {
        // < 3 weekly points draws a line that claims a trend the data can't
        // hold (DataView's "three sessions draws a line" honesty).
        if chartsAllowed, pr.weeklyBest.count >= 3 {
            let values = pr.weeklyBest.map(\.e1rm)
            let lo = (values.min() ?? 0) * 0.98
            let hi = (values.max() ?? 1) * 1.02
            Chart {
                ForEach(pr.weeklyBest) { p in
                    LineMark(x: .value("Week", p.weekStart), y: .value("e1RM", p.e1rm))
                        .foregroundStyle(Theme.amber.opacity(ChartTheme.lineAlpha))
                        .interpolationMethod(.monotone)
                        .lineStyle(StrokeStyle(lineWidth: ChartTheme.lineWidth))
                }
                if let last = pr.weeklyBest.last {
                    PointMark(x: .value("Week", last.weekStart), y: .value("e1RM", last.e1rm))
                        .foregroundStyle(Theme.amber)
                        .symbolSize(36)
                }
            }
            .chartYScale(domain: lo...hi)
            .chartYAxis(.hidden)
            .chartXAxis(.hidden)
            .chartLegend(.hidden)
            .frame(height: ChartTheme.sparkHeight)
            Text(sparkDelta(pr.weeklyBest))
                .font(Theme.data).foregroundStyle(Theme.amber)
        } else {
            Text("First PR on record")
                .font(Theme.body).foregroundStyle(.secondary)
        }
    }

    /// Never frame a PR as a loss — a non-positive in-window delta still landed
    /// a peak this week, so it reads "new peak", not a negative number.
    private func sparkDelta(_ points: [PostMortem.WeeklyPoint]) -> String {
        guard let first = points.first, let last = points.last else { return "new peak" }
        let delta = last.e1rm - first.e1rm
        guard delta > 0 else { return "new peak" }
        let month = first.weekStart.formatted(.dateTime.month(.abbreviated))
        return "+\(Int(delta))kg since \(month)"
    }

    private func evidenceLabel(_ set: SetRecord?) -> String? {
        guard let set else { return nil }
        let weight = set.weightKg.map(weightString) ?? "BW"
        return "\(weight) × \(set.reps)"
    }

    // ── §B Slots ──

    private func slotsSection(_ pm: PostMortem) -> some View {
        VStack(alignment: .leading, spacing: Theme.grid * 2) {
            sectionHeader("Slots")
            if pm.slotsComparable == 0 {
                placeholder("No prior session to compare")
            } else {
                (Text("\(pm.slotsBeaten)").foregroundStyle(Theme.amber)
                 + Text(" of \(pm.slotsComparable) slots beat last session").foregroundStyle(.primary))
                    .font(Theme.data)
            }
        }
    }

    // ── §C Verdicts ──

    private func exercisesSection(_ pm: PostMortem) -> some View {
        VStack(alignment: .leading, spacing: Theme.grid * 3) {
            sectionHeader("Exercises")
            ForEach(pm.outcomes) { outcome in
                HStack(spacing: Theme.grid * 2) {
                    Text(outcome.name.uppercased())
                        .font(.system(size: 17, weight: .semibold).width(.condensed))
                        .lineLimit(1).minimumScaleFactor(0.7)
                    Spacer()
                    Text(outcome.verdict.label)
                        .font(Theme.data)
                        .foregroundStyle(outcome.verdict == .pr ? Theme.green : .secondary)
                }
                .frame(minHeight: Theme.minTouch)
            }
        }
    }

    // ── §D Session vitals ──

    private func vitalsSection(_ pm: PostMortem) -> some View {
        VStack(alignment: .leading, spacing: Theme.grid * 3) {
            sectionHeader("Session")
            HStack(spacing: Theme.grid * 2) {
                statTile(label: "TIME", value: pm.durationLabel ?? "—")
                statTile(label: "SETS", value: "\(pm.totalSets)")
                tonnageTile(pm)
            }
        }
    }

    private func tonnageTile(_ pm: PostMortem) -> some View {
        VStack(alignment: .leading, spacing: Theme.grid) {
            Text("TONNAGE").metaLabel().lineLimit(1).minimumScaleFactor(0.7)
            if pm.isBodyweightSession {
                Text("—").font(Theme.titleData).foregroundStyle(Color(.tertiaryLabel))
                Text("bodyweight").metaLabel()
            } else {
                Text("\(grouped(pm.tonnageKg))kg")
                    .font(Theme.titleData)
                    .lineLimit(1).minimumScaleFactor(0.6)
                    .contentTransition(.numericText())
                if let delta = pm.tonnageDelta {
                    let up = delta > 0
                    Text("\(Int(delta) >= 0 ? "+" : "")\(Int(delta)) \(up ? "▲" : "▼")")
                        .font(Theme.label)
                        .foregroundStyle(up ? Theme.amber : .secondary)
                } else {
                    // Stable scaffolding — hold the row's height when no Δ.
                    Text(" ").font(Theme.label)
                }
            }
        }
        .padding(Theme.margin)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: Theme.cardRadius))
    }

    /// Same statTile pattern as HomeView / DataView (kept private per surface).
    private func statTile(label: String, value: String) -> some View {
        VStack(alignment: .leading, spacing: Theme.grid) {
            Text(label).metaLabel().lineLimit(1).minimumScaleFactor(0.7)
            Text(value)
                .font(Theme.titleData)
                .lineLimit(1).minimumScaleFactor(0.6)
                .foregroundStyle(value == "—" ? Color(.tertiaryLabel) : .primary)
                .contentTransition(.numericText())
            Text(" ").font(Theme.label)   // height-match the tonnage tile's Δ line
        }
        .padding(Theme.margin)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: Theme.cardRadius))
    }

    // ── §E Frequency ──

    private func frequencySection(_ pm: PostMortem) -> some View {
        Text("\(ordinal(pm.sessionsThisWeek)) session this week")
            .font(Theme.data)
            .foregroundStyle(.secondary)
    }

    // ── Shared ──

    private func sectionHeader(_ text: String) -> some View {
        Text(text).metaLabel()
    }

    private func placeholder(_ text: String) -> some View {
        Text(text).font(Theme.body).foregroundStyle(.secondary)
    }

    // ── Formatting ──

    private func oneDecimal(_ v: Double) -> String { String(format: "%.1f", v) }

    private func weightString(_ w: Double) -> String {
        w.truncatingRemainder(dividingBy: 1) == 0
            ? String(format: "%.0f", w)
            : String(format: "%.1f", w)
    }

    private func grouped(_ v: Double) -> String {
        Self.groupedFormatter.string(from: NSNumber(value: Int(v.rounded()))) ?? "\(Int(v))"
    }

    private func ordinal(_ n: Int) -> String {
        Self.ordinalFormatter.string(from: NSNumber(value: n)) ?? "\(n)"
    }

    private static let groupedFormatter: NumberFormatter = {
        let f = NumberFormatter()
        f.numberStyle = .decimal
        f.maximumFractionDigits = 0
        return f
    }()

    private static let ordinalFormatter: NumberFormatter = {
        let f = NumberFormatter()
        f.numberStyle = .ordinal
        return f
    }()
}
