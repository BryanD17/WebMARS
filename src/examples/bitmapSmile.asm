# Bitmap Display demo: a smile face.
#
# To see it, do this:
#   1. Click Assemble.
#   2. Click Run (the program is just a syscall 10 exit; the work
#      is in the .data block below — bytes are loaded into memory
#      at the .data base by the assembler).
#   3. Open Tools menu -> Bitmap Display.
#   4. In the Bitmap Display dialog, leave the defaults:
#        Cell size: 8px
#        Grid: 8 by 8
#        Base address: 0x10010000
#      (If the grid was previously set to something larger, change
#      it back to 8x8 to match the size of this image.)
#   5. Make sure Connect is on. The smile face should be visible.
#
# Each .word below is one pixel: 0x00RRGGBB. 0xFFFF00 is yellow,
# 0x000000 is black background. Reading left-to-right, top-to-
# bottom for an 8x8 grid:
#
#   row 0:  . . . . . . . .
#   row 1:  . Y . . . . Y .
#   row 2:  . Y . . . . Y .
#   row 3:  . . . . . . . .
#   row 4:  . . . . . . . .
#   row 5:  Y . . . . . . Y
#   row 6:  . Y Y Y Y Y Y .
#   row 7:  . . . . . . . .

.data
smile:  .word 0,        0,        0,        0,        0,        0,        0,        0
        .word 0,        0xFFFF00, 0,        0,        0,        0,        0xFFFF00, 0
        .word 0,        0xFFFF00, 0,        0,        0,        0,        0xFFFF00, 0
        .word 0,        0,        0,        0,        0,        0,        0,        0
        .word 0,        0,        0,        0,        0,        0,        0,        0
        .word 0xFFFF00, 0,        0,        0,        0,        0,        0,        0xFFFF00
        .word 0,        0xFFFF00, 0xFFFF00, 0xFFFF00, 0xFFFF00, 0xFFFF00, 0xFFFF00, 0
        .word 0,        0,        0,        0,        0,        0,        0,        0

.text
main:
        # Nothing to compute — the data is already in memory.
        # Open Tools -> Bitmap Display to see the result.
        li      $v0, 10
        syscall
