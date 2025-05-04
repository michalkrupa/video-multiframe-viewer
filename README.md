### Configuration

Edit the contents of the configuration is in index.html (open with Notepad)

* The `sources` of each video set can be used to select the videos you want to display. Make sure they are in the same folder as the viewer code

* To edit the `subtitles`, set the `subtitles` strings to match the attribution you expect for each file.

* To set the start times of each video, edit the `startTimes` array - each value is mapped to the video in the `sources` (i.e., video 1 mapped to subtitle 1, etc.)


``` javascript

    const videoSets = [
      {
        sources: ["1.mp4", "2.mp4", "3.mp4"],
        startTimes: [10, 30, 100],
        subtitles: [
          "Attribution: Video 1 by Artist A",
          "Attribution: Video 2 by Artist B",
          "Attribution: Video 3 by Artist C"
        ],
        scale: [1.5, 1, 1]
      },
      {
        sources: ["6.mp4", "5.webm", "4.mp4"],
        startTimes: [10, 20, 30],
        subtitles: [
          "Attribution: Video 4 by Artist D",
          "Attribution: Video 5 by Artist E",
          "Attribution: Video 6 by Artist F"
        ],
        scale: [1, 1, 1]
      },
      {
        sources: ["7.mp4", "8.mp4", "9.mp4"],
        startTimes: [0, 15, 45],
        subtitles: [
          "Attribution: Video 7 by Artist G",
          "Attribution: Video 8 by Artist H",
          "Attribution: Video 9 by Artist I"
        ],
        scale: [1, 1, 1]
      }
    ];

```