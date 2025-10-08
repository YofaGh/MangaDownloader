# Manga/Manhua Downloader

A powerful desktop application for downloading, managing, and converting manga and manhua from various websites, built with Tauri (React/Rust).

## Features

- Download your favorite manga and webtoons from multiple sources
- Track your reading progress and automatically download new chapters
- Search across various supported websites
- Merge downloaded content into single or paired images
- Convert downloads into PDF files for easier reading
- Find the source of manga/manhua images through reverse search
- Download entire website databases
- Customize download parameters including chapter ranges
- Modern desktop interface with React frontend and Rust backend

## Table of Contents

- [Setup](#setup)
- [Development](#development)
- [Building](#building)
- [Features Guide](#features-guide)
  - [Download Manager](#download-manager)
  - [Library Management](#library-management)
  - [Image Processing](#image-processing)
  - [PDF Conversion](#pdf-conversion)
  - [Search Engine](#search-engine)
  - [Sauce Finder](#sauce-finder)
- [Modules](#modules)
- [Technical Architecture](#technical-architecture)
- [License](#license)
- [Contributing](#contributing)

## Setup

1. Clone the repository
2. Install dependencies:

   ```bash
   yarn install
   ```

3. Run the development version:

   ```bash
   yarn tauri dev
   ```

The application will automatically load all modules defined in the modules library.

## Development

This application uses:

- **Tauri**: Core framework connecting Rust backend with React frontend
- **React**: Frontend UI library for the user interface
- **Rust**: Backend modules and core functionality

## Building

### Build the complete application

```bash
yarn tauri build
```

This will generate executables for your platform in the `src-tauri/target/release` folder.

### Build only the modules library

```bash
cargo build -p modules --release --config modules/.cargo/config.toml
```

### Optimize binary size

Compress the binary files for smaller distribution:

```bash
# Linux/macOS
upx --best modules

# Windows (better compression)
upx --best --lzma modules
```

## Features Guide

### Download Manager

Download manga using the intuitive interface:

- Select from supported websites
- Search for titles
- Set download request frequency
- Monitor download progress in real-time

### Library Management

Keep track of your manga collection:

- View all downloaded series
- Auto-download new chapters for tracked series

### Image Processing

Process downloaded content:

- Merge vertical panels into single images
- Resize and fit images to eliminate white space
- Automatically merge each webtoon after downloading it

### PDF Conversion

Convert chapters or series to PDF:

- Create chapter-by-chapter PDFs
- Automatically convert each webtoon after downloading it

### Search Engine

Find new content easily:

- Search across multiple websites simultaneously
- Filter results by genre, status, and more
- Preview content before downloading
- Sort results by popularity or relevance

### Sauce Finder

Identify the source of manga images:

- Upload local images
- Provide URLs to images
- Get detailed source information
- Direct links to read or download

## Modules

The application uses a modular architecture with Rust-based modules for different websites. Each module implements a common interface to handle:

- Website navigation
- Content detection
- Download management
- Error handling

Modules are loaded dynamically at runtime and can be updated independently of the main application.

## Technical Architecture

The application follows a hybrid architecture:

- **Frontend (React)**: User interface, state management, and interaction
- **Backend (Rust)**: Core functionality, web scraping, file system operations
- **Communication**: Tauri IPC for frontend-backend communication
- **Modules**: Specialized Rust libraries for website-specific functionality

## License

[MIT License](LICENSE)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Contributing New Modules

To add support for a new website:

1. Create a new module in the `modules` directory
2. Implement the required traits for content extraction
3. Add the module to the registry
4. Submit a pull request with documentation

## Examples

![Home Page](examples/HomePage.png?raw=true)
![Download Manager](examples/DownloadManager.png?raw=true)
![Search Page](examples/SearchPage.png?raw=true)
![Manga Page](examples/MangaPage.png?raw=true)