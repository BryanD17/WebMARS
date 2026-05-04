# Phase 3 SA-13 example.
# Polls the MMIO receiver for keystrokes and echoes each character to
# the MMIO transmitter. Open Tools -> Keyboard / Display MMIO, click
# the keyboard input, and type. Each keystroke appears in the display.
#
# 0xffff0000  receiver control  (bit 0 = ready)
# 0xffff0004  receiver data
# 0xffff000c  transmitter data

.text
main:
        # Load the MMIO base address into $t0.
        lui     $t0, 0xffff
poll:
        # Read the receiver control word; loop until bit 0 = 1.
        lw      $t1, 0($t0)
        andi    $t1, $t1, 1
        beq     $t1, $zero, poll

        # Consume the character.
        lw      $t2, 4($t0)

        # Send it back out the transmitter (offset 0x0c).
        sw      $t2, 12($t0)

        # Loop forever; the user closes the tool to stop.
        j       poll
