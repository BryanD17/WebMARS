# sumToN.asm — Sum from 1 to N using a loop
# Input: N via syscall 5, Output: sum 1+2+...+N via syscall 1

.data
prompt:  .asciiz "Enter N: "
result:  .asciiz "Sum = "
newline: .asciiz "\n"

.text
main:
    li $v0, 4
    la $a0, prompt
    syscall

    li $v0, 5
    syscall
    move $t0, $v0       # t0 = N

    li $t1, 0           # t1 = sum
    li $t2, 1           # t2 = i = 1

loop:
    slt $t3, $t0, $t2   # t3 = 1 if N < i
    bne $t3, $zero, done
    add $t1, $t1, $t2
    addi $t2, $t2, 1
    j loop

done:
    li $v0, 4
    la $a0, result
    syscall

    move $a0, $t1
    li $v0, 1
    syscall

    li $v0, 4
    la $a0, newline
    syscall

    li $v0, 10
    syscall
