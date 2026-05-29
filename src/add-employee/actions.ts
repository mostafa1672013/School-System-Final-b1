"use server"

import { query } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { format, differenceInYears } from "date-fns"
import fs from "fs/promises"
import path from "path"

export async function searchEmployees(searchTerm: string) {
  if (!searchTerm || searchTerm.length < 2) return { success: true, employees: [] }
  try {
    const sql = `
      SELECT * FROM employees
      WHERE full_name ILIKE $1 
         OR employee_code ILIKE $1 
         OR national_id ILIKE $1
      LIMIT 5
    `
    const result = await query(sql, [`%${searchTerm}%`])
    return { success: true, employees: result.rows }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function updateEmployee(id: number, data: any, oldData: any) {
  console.log("Updating employee:", id, data)
  try {
    const shiftMap: Record<string, number> = {
      "مناوبة قياسية (Standard)": 1,
      "مناوبة الشعائر الدينية (Religious)": 4,
      "مناوبة ذوي الاحتياجات الخاصة (5%)": 5,
      "مناوبة رعاية الطفل (Nursing)": 6
    }
    const shiftId = shiftMap[data.shiftId] || 1

    const sql = `
      UPDATE employees SET
        full_name = $1, national_id = $2, date_of_birth = $3, gender = $4,
        phone_number = $5, address = $6, governorate = $7, department = $8,
        job_title = $9, shift_id = $10, join_date = $11, contract_start_date = $12,
        contract_duration = $13, contract_end_date = $14, base_salary = $15,
        payment_method = $16, iban = $17, reduced_hour_position = $18
      WHERE id = $19
    `

    const values = [
      data.fullName,
      data.nationalId,
      format(data.dateOfBirth, "yyyy-MM-dd"),
      data.gender,
      data.phoneNumber,
      data.address,
      data.governorate,
      data.department,
      data.jobTitle,
      shiftId,
      format(data.joinDate, "yyyy-MM-dd"),
      format(data.contractStartDate, "yyyy-MM-dd"),
      parseFloat(data.contractDuration),
      data.contractEndDate,
      parseFloat(data.baseSalary),
      data.paymentMethod,
      data.iban || null,
      data.reducedHourPosition || null,
      id
    ]

    await query(sql, values)

    // Audit Log for changes
    const changes: any[] = []
    const fieldNames: Record<string, string> = {
      fullName: "الاسم", nationalId: "الرقم القومي", dateOfBirth: "تاريخ الميلاد",
      gender: "الجنس", phoneNumber: "رقم الهاتف", address: "العنوان",
      governorate: "المحافظة", department: "القسم", jobTitle: "المسمى الوظيفي",
      shiftId: "المناوبة", joinDate: "تاريخ المباشرة", contractStartDate: "بداية العقد",
      contractDuration: "مدة العقد", contractEndDate: "نهاية العقد",
      baseSalary: "الراتب", paymentMethod: "طريقة الصرف", iban: "IBAN"
    }

    for (const key in data) {
      if (JSON.stringify(data[key]) !== JSON.stringify(oldData[key])) {
        changes.push(`${fieldNames[key] || key}: (${oldData[key]} -> ${data[key]})`)
      }
    }

    if (changes.length > 0) {
      const auditSql = `
        INSERT INTO audit_logs (
          table_name, record_id, operation_type, new_data
        ) VALUES ($1, $2, $3, $4)
      `
      const summary = `تعديل بيانات ${data.fullName}: ${changes.join(" | ")}`
      await query(auditSql, ["employees", id, "UPDATE", JSON.stringify({ summary })])
    }

    revalidatePath("/add-employee")
    return { success: true }
  } catch (error: any) {
    console.error("UPDATE ERROR:", error)
    return { success: false, error: error.message }
  }
}

export async function saveEmployee(data: any) {
  // ... existing saveEmployee code ...
  console.log("Saving employee data:", data)
  try {
    // Map shift string to ID (simple mapping for now)
    // Map shift string to ID (now using Arabic keys from UI)
    const shiftMap: Record<string, number> = {
      "مناوبة قياسية (Standard)": 1,
      "مناوبة الشعائر الدينية (Religious)": 4,
      "مناوبة ذوي الاحتياجات الخاصة (5%)": 5,
      "مناوبة رعاية الطفل (Nursing)": 6
    }

    const shiftId = shiftMap[data.shiftId] || 1
    console.log("Mapped shiftId:", shiftId)

    // Calculate initial leave balance
    const age = differenceInYears(new Date(), data.dateOfBirth)
    const isSpecialNeeds = data.shiftId === "مناوبة ذوي الاحتياجات الخاصة (5%)"
    const annualBalance = (age >= 50 || isSpecialNeeds) ? 30 : 21
    const casualBalance = 6

    const values = [
      data.employeeCode,
      data.fullName,
      data.nationalId,
      format(data.dateOfBirth, "yyyy-MM-dd"),
      data.gender,
      data.phoneNumber,
      data.address,
      data.governorate,
      data.department,
      data.jobTitle,
      shiftId,
      format(data.joinDate, "yyyy-MM-dd"),
      format(data.contractStartDate, "yyyy-MM-dd"),
      parseFloat(data.contractDuration),
      data.contractEndDate,
      parseFloat(data.baseSalary),
      data.paymentMethod,
      data.iban || null,
      data.reducedHourPosition || null,
      annualBalance,
      casualBalance
    ]

    const sql = `
      INSERT INTO employees (
        employee_code, full_name, national_id, date_of_birth, gender,
        phone_number, address, governorate, department, job_title, shift_id,
        join_date, contract_start_date, contract_duration, contract_end_date,
        base_salary, payment_method, iban, reduced_hour_position,
        annual_leave_balance, casual_leave_balance
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
      ) RETURNING id;
    `

    console.log("Executing SQL with values:", values)
    const result = await query(sql, values)
    const newEmployeeId = result.rows[0].id
    console.log("Save successful, ID:", newEmployeeId)

    // Audit Log
    try {
      const auditSql = `
        INSERT INTO audit_logs (
          table_name, record_id, operation_type, new_data
        ) VALUES ($1, $2, $3, $4)
      `
      await query(auditSql, [
        "employees",
        newEmployeeId,
        "INSERT",
        JSON.stringify(data)
      ])
      console.log("Audit log created")
    } catch (auditError) {
      console.error("FAILED TO CREATE AUDIT LOG:", auditError)
      // We don't fail the whole request if audit log fails, but we should log it
    }

    revalidatePath("/add-employee")
    return { success: true, employeeId: newEmployeeId }
  } catch (error: any) {
    console.error("DATABASE SAVE ERROR:", error)
    return { success: false, error: error.message }
  }
}
export async function requestLeave(formData: FormData) {
  try {
    const employeeId = parseInt(formData.get("employeeId") as string)
    const leaveType = formData.get("leaveType") as string
    const startDate = formData.get("startDate") as string
    const endDate = formData.get("endDate") as string
    const reason = formData.get("reason") as string
    const file = formData.get("attachment") as File
    
    let attachmentUrl = ""
    if (file && file.size > 0) {
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      const fileName = `${Date.now()}-${file.name}`
      const uploadPath = path.join(process.cwd(), "public", "uploads", fileName)
      await fs.writeFile(uploadPath, buffer)
      attachmentUrl = `/uploads/${fileName}`
    }

    // Special check for Maternity Leave
    if (leaveType === "إجازة وضع") {
      const empRes = await query("SELECT gender, maternity_leave_counter FROM employees WHERE id = $1", [employeeId])
      const emp = empRes.rows[0]
      if (emp.gender !== "أنثى") throw new Error("إجازة الوضع متاحة للإناث فقط")
      if (emp.maternity_leave_counter >= 2) throw new Error("تم استنفاذ مرات استحقاق إجازة الوضع (الحد الأقصى مرتان)")
    }

    const sql = `
      INSERT INTO leave_requests (employee_id, leave_type, start_date, end_date, reason, attachment_url)
      VALUES ($1, $2, $3, $4, $5, $6)
    `
    await query(sql, [employeeId, leaveType, startDate, endDate, reason, attachmentUrl])
    
    revalidatePath("/add-employee")
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function processLeave(requestId: number, status: "Approved" | "Rejected", adminId: number, rejectionReason?: string) {
  try {
    const reqRes = await query("SELECT * FROM leave_requests WHERE id = $1", [requestId])
    const leaveReq = reqRes.rows[0]
    const empRes = await query("SELECT * FROM employees WHERE id = $1", [leaveReq.employee_id])
    const emp = empRes.rows[0]

    if (status === "Approved") {
      if (leaveReq.leave_type === "إجازة وضع") {
        await query("UPDATE employees SET maternity_leave_counter = maternity_leave_counter + 1 WHERE id = $1", [emp.id])
      } else if (leaveReq.leave_type === "إجازة عارضة") {
        if (emp.casual_leave_balance <= 0) throw new Error("رصيد الإجازات العارضة منتهي")
        await query("UPDATE employees SET casual_leave_balance = casual_leave_balance - 1, annual_leave_balance = annual_leave_balance - 1 WHERE id = $1", [emp.id])
      } else if (leaveReq.leave_type === "إجازة سنوية") {
        // Calculate days
        const start = new Date(leaveReq.start_date)
        const end = new Date(leaveReq.end_date)
        const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1
        if (emp.annual_leave_balance < days) throw new Error("رصيد الإجازات السنوية غير كافٍ")
        await query("UPDATE employees SET annual_leave_balance = annual_leave_balance - $1 WHERE id = $2", [days, emp.id])
      }
    }

    await query("UPDATE leave_requests SET status = $1, rejection_reason = $2 WHERE id = $3", [status, rejectionReason || null, requestId])

    // Audit Log
    const adminRes = await query("SELECT full_name FROM employees WHERE id = $1", [adminId])
    const adminName = adminRes.rows[0]?.full_name || "Admin"
    const auditMsg = `${status === 'Approved' ? 'موافقة' : 'رفض'} على ${leaveReq.leave_type} للموظف ${emp.full_name} بواسطة ${adminName}`
    
    await query("INSERT INTO audit_logs (table_name, record_id, operation_type, new_data) VALUES ($1, $2, $3, $4)", 
      ["leave_requests", requestId, "UPDATE", JSON.stringify({ summary: auditMsg, status, rejectionReason })]
    )

    revalidatePath("/add-employee")
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
