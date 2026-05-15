frappe.ui.form.on('Stock Entry', {
    setup(frm) {
        console.log("=================");
        frm._freeze_fg_qty = frm.doc.fg_completed_qty || 0;
    },

    refresh(frm) {
        frm.set_df_property('fg_completed_qty', 'read_only', 0);
        frm._freeze_fg_qty = frm.doc.fg_completed_qty || 0;
        update_process_loss(frm);

        setTimeout(function() {
            calculate_all(frm);
        }, 500);

        // New document + Work Order available
        if (frm.doc.__islocal == 1 && frm.doc.work_order) {
            let promises = (frm.doc.items || []).map(function(row) {
                if (row.item_code) {
                    return frappe.db.get_value("Item", row.item_code, "custom_is_byproduct_item")
                        .then(function(r) {
                            if (r && r.message) {
                                return frappe.model.set_value(
                                    row.doctype,
                                    row.name,
                                    "custom_is_byproduct_item",
                                    r.message.custom_is_byproduct_item ? 1 : 0
                                );
                            }
                        });
                }
                return Promise.resolve();
            });
            Promise.all(promises).then(function() {
                frm.refresh_field("items");
            });
        }
    },

    onload(frm) {
        setTimeout(function() {
            calculate_all(frm);
        }, 800);
    },

    onload_post_render(frm) {
        calculate_all(frm);
    },

    stock_entry_type(frm) {
        calculate_all(frm);
    },

    fg_completed_qty(frm) {
        frm._freeze_fg_qty = flt(frm.doc.fg_completed_qty);
        update_process_loss(frm);
    }
});

// =============================================
// STOCK ENTRY DETAIL - CHILD TABLE EVENTS
// =============================================
frappe.ui.form.on('Stock Entry Detail', {
    qty(frm, cdt, cdn) {
        update_process_loss(frm);
        calculate_all(frm);
    },

    s_warehouse(frm, cdt, cdn) {
        calculate_all(frm);
    },

    t_warehouse(frm, cdt, cdn) {
        calculate_all(frm);

        // is_scrap_item logic
        let row = locals[cdt][cdn];
        if (row.t_warehouse) {
            frappe.model.set_value(cdt, cdn, "is_scrap_item", 1);
        } else {
            frappe.model.set_value(cdt, cdn, "is_scrap_item", 0);
        }
        frm.refresh_field("items");
    },

    is_finished_item(frm, cdt, cdn) {
        calculate_all(frm);
    },

    custom_is_byproduct_item(frm, cdt, cdn) {
        calculate_all(frm);
    },

    items_remove(frm) {
        update_process_loss(frm);
        calculate_all(frm);
    }
});

// =============================================
// PROCESS LOSS - FREEZE FG QTY LOGIC
// =============================================
function update_process_loss(frm) {
    let finished_qty = 0;

    (frm.doc.items || []).forEach(row => {
        if (row.is_finished_item) {
            finished_qty += flt(row.qty);
        }
    });

    let fg_qty = flt(frm._freeze_fg_qty || frm.doc.fg_completed_qty);

    // fg_completed_qty freeze rakho
    frm.doc.fg_completed_qty = fg_qty;
    frm.refresh_field('fg_completed_qty');

    // process_loss_qty = fg_completed_qty - finished item qty
    let process_loss = fg_qty - finished_qty;
    frm.doc.process_loss_qty = flt(process_loss, 3);
    frm.refresh_field('process_loss_qty');

    // process_loss_percentage = (process_loss_qty / fg_completed_qty) * 100
    let loss_percentage = 0;
    if (fg_qty > 0) {
        loss_percentage = (process_loss / fg_qty) * 100;
    }
    frm.doc.process_loss_percentage = flt(loss_percentage, 2);
    frm.refresh_field('process_loss_percentage');
}

// =============================================
// CALCULATE ALL - MANUFACTURE ENTRY ONLY
// =============================================
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
