use crate::queries::{
    BetaRow, InviteDistRow, InviteRow, OverviewStats, Registration, UserRow, WorkoutRow,
};

pub fn overview(stats: &OverviewStats, registrations: &[Registration], workouts: &[WorkoutRow]) {
    println!("LIGHTWEIGHT ADMIN");
    println!("{}", "─".repeat(50));
    println!(
        "Users: {}        Invites: {} created / {} claimed",
        stats.total_users, stats.invites_created, stats.invites_claimed
    );
    println!("Auth sessions: {} active (unexpired)", stats.active_auth_sessions);

    println!();
    println!("RECENT REGISTRATIONS (7d)");
    if registrations.is_empty() {
        println!("  (none)");
    } else {
        for r in registrations {
            let source = match &r.invited_by {
                Some(name) => format!("invited by {name}"),
                None => "admin".to_string(),
            };
            println!("  {}  {:<12} ({})", format_date(&r.created_at), r.username, source);
        }
    }

    println!();
    println!("RECENT WORKOUTS (7d)");
    if workouts.is_empty() {
        println!("  (none)");
    } else {
        for w in workouts {
            let dur = format_duration(w.duration_min);
            println!(
                "  {}  {:<12} {:<20} {:>5}  {} sets",
                w.date, w.username, w.workout_name, dur, w.set_count
            );
        }
    }
}

pub fn users(rows: &[UserRow]) {
    println!(
        "{:<4} {:<12} {:<12} {:<12} {:>4} {:>8} {:<12}",
        "ID", "USERNAME", "JOINED", "INVITED BY", "AUTH", "WORKOUTS", "LAST WORKOUT"
    );
    println!("{}", "─".repeat(72));
    for u in rows {
        let invited = u
            .invited_by
            .as_deref()
            .unwrap_or("(admin)");
        let last = u
            .last_workout
            .as_deref()
            .map(|d| format_date(d))
            .unwrap_or_else(|| "—".to_string());
        println!(
            "{:<4} {:<12} {:<12} {:<12} {:>4} {:>8} {:<12}",
            u.id,
            u.username,
            format_date(&u.created_at),
            invited,
            u.auth_sessions,
            u.workout_count,
            last,
        );
    }
}

pub fn invites(dist: &[InviteDistRow], all: &[InviteRow]) {
    println!("INVITE DISTRIBUTION");
    if dist.is_empty() {
        println!("  (no invites created)");
    } else {
        for d in dist {
            println!(
                "  {:<12} {} created, {} claimed  (quota: {})",
                d.username, d.created, d.claimed, d.quota
            );
        }
    }

    println!();
    println!(
        "{:<10} {:<12} {:<8} {:<12} {:<12} {:<12}",
        "CODE", "CREATOR", "STATUS", "CLAIMED BY", "CREATED", "CLAIMED"
    );
    println!("{}", "─".repeat(68));
    for inv in all {
        let status = if inv.claimed_by.is_some() {
            "claimed"
        } else {
            "pending"
        };
        let claimed_by = inv.claimed_by.as_deref().unwrap_or("—");
        let claimed_at = inv
            .claimed_at
            .as_deref()
            .map(|d| format_date(d))
            .unwrap_or_else(|| "—".to_string());
        println!(
            "{:<10} {:<12} {:<8} {:<12} {:<12} {:<12}",
            inv.code_short,
            inv.creator,
            status,
            claimed_by,
            format_date(&inv.created_at),
            claimed_at,
        );
    }
}

pub fn beta(signups: &[BetaRow]) {
    println!("BETA SIGNUPS");
    if signups.is_empty() {
        println!("  (none)");
        return;
    }
    println!(
        "  {:<28} {:<12} {:<10} {:<10} {:<12} {:<10}",
        "EMAIL", "USER", "PLATFORM", "STATUS", "DATE", "REFERRER"
    );
    println!("  {}", "─".repeat(84));
    for s in signups {
        let referrer = s.referrer.as_deref().unwrap_or("—");
        let user = s.username.as_deref().unwrap_or("—");
        println!(
            "  {:<28} {:<12} {:<10} {:<10} {:<12} {:<10}",
            s.email,
            user,
            s.platform,
            s.status,
            format_date(&s.created_at),
            referrer,
        );
    }
}

pub fn activity(workouts: &[WorkoutRow], days: u32) {
    println!("RECENT ACTIVITY ({days} days)");
    if workouts.is_empty() {
        println!("  (none)");
        return;
    }
    println!(
        "  {:<12} {:<12} {:<20} {:>8} {:>5}",
        "DATE", "USER", "WORKOUT", "DURATION", "SETS"
    );
    println!("  {}", "─".repeat(60));
    for w in workouts {
        let dur = format_duration(w.duration_min);
        println!(
            "  {:<12} {:<12} {:<20} {:>8} {:>5}",
            w.date, w.username, w.workout_name, dur, w.set_count
        );
    }
}

fn format_date(datetime_str: &str) -> String {
    // Timestamps are stored as "YYYY-MM-DD HH:MM:SS" — extract just the date
    datetime_str.split(' ').next().unwrap_or(datetime_str).to_string()
}

fn format_duration(minutes: Option<i64>) -> String {
    match minutes {
        Some(m) if m >= 60 => format!("{}h{}m", m / 60, m % 60),
        Some(m) => format!("{m}min"),
        None => "—".to_string(),
    }
}
