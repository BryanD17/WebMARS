# Phase 2B FPU example.
# Computes sqrt(a*a + b*b) and prints the integer-truncated result.

.data
a_int:  .word 3
b_int:  .word 4

.text
main:
        # Load the two integers into GPRs.
        la      $t0, a_int
        lw      $t1, 0($t0)
        la      $t0, b_int
        lw      $t2, 0($t0)

        # Move them across to the FPU and convert to single-precision.
        mtc1    $t1, $f0
        cvt.s.w $f0, $f0
        mtc1    $t2, $f1
        cvt.s.w $f1, $f1

        # squared = a*a + b*b
        mul.s   $f2, $f0, $f0
        mul.s   $f3, $f1, $f1
        add.s   $f4, $f2, $f3

        # sqrt + truncate to int32; print via syscall 1.
        sqrt.s  $f5, $f4
        cvt.w.s $f6, $f5
        mfc1    $a0, $f6
        li      $v0, 1
        syscall

        li      $v0, 10
        syscall
