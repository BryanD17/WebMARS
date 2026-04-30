# syscallIO.asm — Demonstrate all 5 syscalls

.data
prompt_int:  .asciiz "Enter an integer: "
prompt_str:  .asciiz "Enter a string: "
echo_int:    .asciiz "You entered integer: "
echo_str:    .asciiz "You entered string: "
newline:     .asciiz "\n"
buffer:      .space 64

.text
main:
    # syscall 4: print_string
    li $v0, 4
    la $a0, prompt_int
    syscall

    # syscall 5: read_int
    li $v0, 5
    syscall
    move $t0, $v0

    # syscall 1: print_int
    li $v0, 4
    la $a0, echo_int
    syscall
    move $a0, $t0
    li $v0, 1
    syscall

    li $v0, 4
    la $a0, newline
    syscall

    # syscall 8: read_string
    li $v0, 4
    la $a0, prompt_str
    syscall
    la $a0, buffer
    li $a1, 64
    li $v0, 8
    syscall

    # print back
    li $v0, 4
    la $a0, echo_str
    syscall
    la $a0, buffer
    li $v0, 4
    syscall

    # syscall 10: exit
    li $v0, 10
    syscall
