# arraySum.asm — Sum an array of integers stored in .data, print the result

.data
arr:    .word 10, 20, 30, 40, 50
len:    .word 5
result: .asciiz "Array sum = "
newline: .asciiz "\n"

.text
main:
    la $t0, arr         # t0 = base address of array
    la $t1, len
    lw $t1, 0($t1)      # t1 = length
    li $t2, 0           # t2 = sum
    li $t3, 0           # t3 = index

loop:
    beq $t3, $t1, done
    sll $t4, $t3, 2     # t4 = index * 4
    add $t4, $t4, $t0   # t4 = &arr[i]
    lw $t5, 0($t4)      # t5 = arr[i]
    add $t2, $t2, $t5
    addi $t3, $t3, 1
    j loop

done:
    li $v0, 4
    la $a0, result
    syscall

    move $a0, $t2
    li $v0, 1
    syscall

    li $v0, 4
    la $a0, newline
    syscall

    li $v0, 10
    syscall
