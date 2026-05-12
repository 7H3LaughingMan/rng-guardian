# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/)
and this project adheres to [Semantic Versioning](https://semver.org/).

## [14.0.1] - 2026-05-12

### Changed

- Changed the Create/Update ChatMessage Hooks so they only execute on the active GM, this way they don't accidentally get spammed with everyone requesting the GM to check the rolls.

### Fixed

- Fixed an issue with Dice So Nice! adding temporary values to die results, now just compare an array of numbers instead.

## [14.0.0] - 2026-05-11

Initial Release

[14.0.1]: https://github.com/7H3LaughingMan/rng-guardian/compare/v14.0.0...v14.0.1
[14.0.0]: https://github.com/7H3LaughingMan/rng-guardian/releases/tag/v14.0.0
