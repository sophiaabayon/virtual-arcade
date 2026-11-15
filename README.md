# Pixel Parlor

A small online arcade built with plain HTML, CSS and JavaScript. No frameworks,
no build step, no backend. Open `index.html` in a browser and play.

## Planned features

- Dashboard homepage and a searchable game library with categories
- Six playable games: Snake, Tic-Tac-Toe, Memory Match, Rock Paper Scissors,
  Whack-a-Mole and 2048
- High scores, favorites, recently played games and a player profile
- Sound controls and a light/dark theme
- Everything saved in `localStorage`

## Project layout

```
index.html      entry point
css/            design tokens, layout, components, game styles
js/core/        shared helpers: storage, audio, router
js/views/       pages: home, library, game, profile
js/games/       one file per game
```

## Commit conventions

Commit messages follow `type(scope): summary` in the imperative mood, for
example `feat(snake): add keyboard and swipe controls`. Types in use: `feat`,
`fix`, `style`, `refactor`, `test`, `docs`, `chore`. One logical change per commit.
