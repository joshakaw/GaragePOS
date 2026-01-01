# Counting Register at Start Shift and End Shift

A shift is the time between when a clerk signs into the POS and when a clerk signs out. They should count their register at the start and the end of the shift.

There is a "Start Shift" adjustment transaction and an "End Shift" adjustment transaction. So if they count the register as under what they should've ended with (at end of shift), the End Shift transaction would add an expense as a Transaction.
- This would use a predefined End Shift product. (Some products are system-defined, and not removable, to define POS behavior)
- Same for Start Shift, a predefined product exists on DB.


