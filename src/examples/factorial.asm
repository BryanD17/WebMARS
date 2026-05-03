# factorial.asm — Recursive factorial using jal/jr and the stack
# Input: N via syscall 5, Output: N! via syscall 1

.data
prompt:  .asciiz "Enter N: "
result:  .asciiz "N! = "
newline: .asciiz "\n"

.text
main:
    li $v0, 4
    la $a0, prompt
    syscall

    li $v0, 5
    syscall
    move $a0, $v0

    jal factorial

    move $t0, $v0

    li $v0, 4
    la $a0, result
    syscall

    move $a0, $t0
    li $v0, 1
    syscall

    li $v0, 4
    la $a0, newline
    syscall

    li $v0, 10
    syscall

# factorial(n): returns n! in $v0, argument in $a0
factorial:
    addi $sp, $sp, -8
    sw $ra, 4($sp)
    sw $a0, 0($sp)

    li $t0, 1
    slt $t1, $a0, $t0   # t1 = 1 if n < 1
    bne $t1, $zero, base_case

    addi $a0, $a0, -1
    jal factorial

    lw $a0, 0($sp)
    lw $ra, 4($sp)
    addi $sp, $sp, 8

    mult $v0, $a0
    mflo $v0
    jr $ra

base_case:
    lw $ra, 4($sp)
    addi $sp, $sp, 8
    li $v0, 1
    jr $ra
