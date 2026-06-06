# Daily Update Routine

When updating the baseball spreadsheet and website:

1. Run the daily spreadsheet refresh for the requested board date.
2. Export and publish the website board for that board date.
3. Confirm the website board includes current K/G values for all live/probable pitchers.
   - K/G means actual pitcher season strikeouts per game started.
   - Source it from pitcher game logs as `season strikeOuts / gamesStarted`.
   - Report any pitcher whose K/G is still blank after export.
4. Confirm the website payload includes current overall records for Models 1, 2, 6, 4, and 5.
   - The homepage has fallback records, but the daily CSV/API payload should still include each model's record, win rate, plays, and ROI.
   - Do not leave any model record as blank or `TBD`.
5. Grade the previous board as Yesterday's Picks using MLB box scores.
6. Publish Yesterday's Picks to the website.
7. Verify both endpoints:
   - `/api/picks`
   - `/api/yesterday-picks`

Do not consider the update complete until Yesterday's Picks have been updated too.
Do not consider the website board complete until K/G has been checked.
Do not consider the website board complete until every displayed model has an overall record.
