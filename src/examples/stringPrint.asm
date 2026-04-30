# stringPrint.asm — Print a greeting string using .asciiz and syscall 4

.data
greeting: .asciiz "Hello from WebMARS!\n"
line2:    .asciiz "MIPS is fun.\n"

.text
main:
    li $v0, 4
    la $a0, greeting
    syscall

    li $v0, 4
    la $a0, line2
    syscall

    li $v0, 10
    syscall
