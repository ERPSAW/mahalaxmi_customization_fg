frappe.ui.form.on('Stock Entry', {
    refresh: function (frm) {
        console.log("-----------------")
        calculate_all_rows(frm);
        calculate_totals(frm);
        set_sfg_batch(frm);
    },
    validate: function (frm) {
        calculate_all_rows(frm);
        calculate_totals(frm);
        set_sfg_batch(frm);
    }
});

frappe.ui.form.on('Stock Entry Detail', {
    basic_rate: function (frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        if (frm.doc.stock_entry_type === "Repack" && row.basic_rate) {
            frappe.model.set_value(cdt, cdn, 'custom_per_kg_cost_', row.basic_rate);
        }
        calculate_row(frm, cdt, cdn);
        calculate_totals(frm);
    },
    custom_packet_size: function (frm, cdt, cdn) {
        calculate_row(frm, cdt, cdn);
        calculate_totals(frm);
    },
    custom_per_kg_cost_: function (frm, cdt, cdn) {
        calculate_row(frm, cdt, cdn);
        calculate_totals(frm);
    },
    qty: function (frm, cdt, cdn) {
        calculate_row(frm, cdt, cdn);
        calculate_totals(frm);
    },
    custom_total_kg_consumed: function (frm, cdt, cdn) {
        calculate_totals(frm);
    },
    custom_packaging_item: function (frm) {
        set_sfg_batch(frm);
    },
    item_code: function (frm) {
        set_sfg_batch(frm);
    },
    items_add: function (frm) {
        calculate_all_rows(frm);
        calculate_totals(frm);
        set_sfg_batch(frm);
    },
    items_remove: function (frm) {
        calculate_totals(frm);
    }
});

// ===============================
// 🔹 Row Level Calculation
// ===============================
function calculate_row(frm, cdt, cdn) {
    let row = locals[cdt][cdn];
    if (frm.doc.stock_entry_type !== "Repack") return;

    let packet_size = flt(row.custom_packet_size);
    let per_kg = flt(row.custom_per_kg_cost_);
    let qty = flt(row.qty);

    // FG cost per packet
    let fg_cost = packet_size * per_kg;
    frappe.model.set_value(cdt, cdn, 'custom_per_packet_fg_cost', fg_cost);

    // Total KG consumed
    let total_kg = qty * packet_size;
    frappe.model.set_value(cdt, cdn, 'custom_total_kg_consumed', total_kg);
}

// ===============================
// 🔹 All Rows Calculation
// ===============================
function calculate_all_rows(frm) {
    if (frm.doc.stock_entry_type !== "Repack") return;

    (frm.doc.items || []).forEach(function (row) {
        if (row.basic_rate) {
            frappe.model.set_value(row.doctype, row.name, 'custom_per_kg_cost_', row.basic_rate);
        }

        let packet_size = flt(row.custom_packet_size);
        let per_kg = flt(row.custom_per_kg_cost_);
        let qty = flt(row.qty);

        let fg_cost = packet_size * per_kg;
        frappe.model.set_value(row.doctype, row.name, 'custom_per_packet_fg_cost', fg_cost);

        let total_kg = qty * packet_size;
        frappe.model.set_value(row.doctype, row.name, 'custom_total_kg_consumed', total_kg);
    });
}

// ===============================
// 🔹 Totals Calculation (FG / SFG / Loss)
// ===============================
function calculate_totals(frm) {
    let fg_total = 0;
    let sfg_total = 0;
    let per_kg_cost = 0;

    (frm.doc.items || []).forEach(function (row) {
        // FG incoming
        if (row.custom__is_fg_item) {
            fg_total += flt(row.custom_total_kg_consumed);
            per_kg_cost = flt(row.custom_per_kg_cost_); // FG row se lete hain
        }
        // SFG outgoing
        if (row.custom_is_sfg_item) {
            sfg_total += flt(row.qty);
        }
    });

    frm.set_value('custom_total_incoming_kg_fg', fg_total);
    frm.set_value('custom_total_outgoing_kg_sfg__', sfg_total);

    // Process loss
    let process_loss = flt(sfg_total) - flt(fg_total);
    frm.set_value('custom_process_loss_quantity', process_loss);

    // ✅ Loss amount = custom_per_kg_cost_ * custom_process_loss_quantity
    let loss_amount = flt(per_kg_cost) * flt(process_loss);
    frm.set_value('custom_packaging_loss_amount', loss_amount);

    // Checkbox
    frm.set_value('custom_is_packaging_loss', process_loss > 0 ? 1 : 0);
}

// ===============================
// 🔹 Batch Generation
// ===============================
function set_sfg_batch(frm) {
    (frm.doc.items || []).forEach(function (row) {
        if (row.custom_packaging_item && row.item_code) {
            let match = row.item_code.match(/(\d{4})$/);
            let last_digits = match ? match[1] : "";

            if (last_digits) {
                let today = new Date(frappe.datetime.get_today());
                let month = ("0" + (today.getMonth() + 1)).slice(-2);
                let year = today.getFullYear().toString().slice(-2);
                let batch_name = `RM/${month}/${year}/${last_digits}`;
                frappe.model.set_value(row.doctype, row.name, 'custom_sfg_batch', batch_name);
            }
        }
    });
}

