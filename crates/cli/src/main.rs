mod client;
mod commands;

use clap::{Parser, Subcommand};

#[derive(Parser)]
#[command(name = "lw", about = "Lightweight workout tracker CLI")]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Login and save token
    Login,
    /// Manage exercises
    Exercises {
        #[command(subcommand)]
        command: commands::exercises::ExerciseCommands,
    },
    /// Manage templates
    Templates {
        #[command(subcommand)]
        command: commands::templates::TemplateCommands,
    },
    /// Manage workout sessions
    Sessions {
        #[command(subcommand)]
        command: commands::sessions::SessionCommands,
    },
    /// Import workout data
    Import {
        #[arg(long)]
        file: String,
    },
}

#[tokio::main]
async fn main() {
    let cli = Cli::parse();
    let client = match client::Client::from_config() {
        Ok(c) => c,
        Err(e) => {
            eprintln!("Error loading config: {}", e);
            eprintln!("Run `lw login` to configure.");
            std::process::exit(1);
        }
    };

    let result = match cli.command {
        Commands::Login => commands::login(&client).await,
        Commands::Exercises { command } => commands::exercises::handle(&client, command).await,
        Commands::Templates { command } => commands::templates::handle(&client, command).await,
        Commands::Sessions { command } => commands::sessions::handle(&client, command).await,
        Commands::Import { file } => commands::import::handle(&client, &file).await,
    };

    if let Err(e) = result {
        eprintln!("Error: {}", e);
        std::process::exit(1);
    }
}
