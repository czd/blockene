# Sounds

Drop the following files here:

- `grab.mp3` — block pickup (soft thud)
- `slide.mp3` — block sliding (subtle scrape, plays on a loop while dragging)
- `collide.mp3` — block hits a wall or another block (light click)
- `exit.mp3` — block leaves through a door (satisfying pop)
- `win.mp3` — level complete (short chime)

The audio module lazy-loads each file the first time it plays. Missing files
log to the console; they never throw.
