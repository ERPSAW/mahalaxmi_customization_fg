frappe.ui.form.on('Stock Entry', {
    refresh: function(frm) {
        setTimeout(function() {
            calculate_all(frm);
        }, 500);
    },
    onload: function(frm) {
        setTimeout(function() {
            calculate_all(frm);
        }, 800);
    },
    onload_post_render: function(frm) {
        calculate_all(frm);
    },
    stock_entry_type: function(frm) {
        calculate_all(frm);
    }
});

frappe.ui.form.on('Stock Entry Detail', {
    qty: function(frm, cdt, cdn) {
        calculate_all(frm);
    },
    s_warehouse: function(frm, cdt, cdn) {
        calculate_all(frm);
    },
    t_warehouse: function(frm, cdt, cdn) {
        calculate_all(frm);
    },
    is_finished_item: function(frm, cdt, cdn) {
        calculate_all(frm);
    },
    custom_is_byproduct_item: function(frm, cdt, cdn) {
        calculate_all(frm);
    },
    items_remove: function(frm) {
        calculate_all(frm);
    }
});

function calculate_all(frm) {
    if (frm.doc.stock_entry_type !== 'Manufacture') return;
    set_production_quantity(frm);
    set_byproduct_input(frm);
    set_byproduct_output(frm);
    set_finished_goods_quantity(frm);
    set_total_material_consumption(frm);
    set_total_output(frm);
    set_grinding_loss(frm);
}

// -----------------------------
// Production Quantity
// -----------------------------
function set_production_quantity(frm) {
    let total_qty = 0;
    (frm.doc.items || []).forEach(function(row) {
        if (row.s_warehouse && !row.custom_is_byproduct_item) {
            total_qty += flt(row.qty);
        }
    });
    frm.set_value('custom_production_quantity_kg', flt(total_qty, 3));
}

// -----------------------------
// By Product Input
// -----------------------------
function set_byproduct_input(frm) {
    let byproduct_qty = 0;
    (frm.doc.items || []).forEach(function(row) {
        if (row.s_warehouse && row.custom_is_byproduct_item) {
            byproduct_qty += flt(row.qty);
        }
    });
    frm.set_value('custom_by_product_in_kg', flt(byproduct_qty, 3));
}

// -----------------------------
// By Product Output
// -----------------------------
function set_byproduct_output(frm) {
    let byproduct_output_qty = 0;
    (frm.doc.items || []).forEach(function(row) {
        if (row.t_warehouse && row.custom_is_byproduct_item) {
            byproduct_output_qty += flt(row.qty);
        }
    });
    frm.set_value('custom_by_product_out_kg', flt(byproduct_output_qty, 3));
}

// -----------------------------
// Finished Goods Quantity
// -----------------------------
function set_finished_goods_quantity(frm) {
    let finished_qty = 0;
    (frm.doc.items || []).forEach(function(row) {
        if (row.t_warehouse && row.is_finished_item) {
            finished_qty += flt(row.qty);
        }
    });
    frm.set_value('custom_finished_goods_out_kg', flt(finished_qty, 3));
}

// -----------------------------
// Total Material Consumption
// -----------------------------
function set_total_material_consumption(frm) {
    let total =
        flt(frm.doc.custom_production_quantity_kg) +
        flt(frm.doc.custom_by_product_in_kg);
    frm.set_value('custom_total_material_in_bp_kg_consumption', flt(total, 3));
}

// -----------------------------
// Total Output
// -----------------------------
function set_total_output(frm) {
    let total =
        flt(frm.doc.custom_finished_goods_out_kg) +
        flt(frm.doc.custom_by_product_out_kg);
    frm.set_value('custom_total_output_kg', flt(total, 3));
}

// -----------------------------
// Grinding Loss
// -----------------------------
function set_grinding_loss(frm) {
    let consumption = flt(frm.doc.custom_total_material_in_bp_kg_consumption);
    let output = flt(frm.doc.custom_total_output_kg);

    // Grinding Loss KG
    let loss = consumption - output;
    frm.set_value('custom_grinding_loss_kg', flt(loss, 3));

    // Grinding Loss %
    let loss_percentage = 0;
    if (consumption > 0) {
        loss_percentage = (loss / consumption) * 100;
    }
    frm.set_value('custom_grinding_loss_', flt(loss_percentage, 2));
}