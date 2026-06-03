frappe.ui.form.on('Stock Entry', {
    setup(frm) {
        frm.doc._freeze_fg_qty = frm.doc.fg_completed_qty || 0;
    },

    refresh(frm) {
        frm.set_df_property('fg_completed_qty', 'read_only', 0);
        frm.doc._freeze_fg_qty = frm.doc.fg_completed_qty || 0;
        update_process_loss(frm);

        // Use silent calc on refresh to avoid dirtying form
        setTimeout(function() {
            calculate_all_silent(frm);
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
            calculate_all_silent(frm);
        }, 800);
    },

    onload_post_render(frm) {
        calculate_all_silent(frm);
    },

    stock_entry_type(frm) {
        calculate_all(frm);
    },

    fg_completed_qty(frm) {
        if(!frm.doc._freeze_fg_qty){
            frm.doc._freeze_fg_qty = flt(frm.doc.fg_completed_qty);
        }

        update_process_loss(frm);
    },
    
    set_fg_completed_qty(frm) {
		let fg_completed_qty = 0;

		frm.doc.items.forEach((item) => {
			if (item.is_finished_item) {
				fg_completed_qty += flt(item.transfer_qty);
			}
		});

		frm.doc.fg_completed_qty = fg_completed_qty;

		if(frm.doc._freeze_fg_qty){
            frm.doc.fg_completed_qty = frm.doc._freeze_fg_qty;
        }

		frm.refresh_field("fg_completed_qty");
	},

    onload(frm) {
        refresh_all_rows(frm);
    },

    validate(frm) {
        calculate_pm_cost(frm);
        calculate_all(frm);

        (frm.doc.items || []).forEach(function(row) {
            // 🔒 LOCK
            if (row.custom_is_packaging_material) return;

            let basic_rate = flt(row.basic_rate);
            if (basic_rate > 0) {
                // Use direct assignment in validate — form will be saved anyway
                row.custom_final_rate_after_loss = basic_rate;
            }
        });
    },

    items_add(frm) {
        calculate_pm_cost(frm);
        calculate_totals(frm);
    },

    custom_process_loss_quantity(frm) {
        calculate_process_loss(frm);
        calculate_distribution(frm);
    },

    custom_total_outgoing_kg_sfg__(frm) {
        calculate_process_loss(frm);
    },

    custom_packaging_loss_amount(frm) {
        calculate_distribution(frm);
    },

    custom_is_packaging_loss(frm) {
        frm.doc.items.forEach(function(row) {
            frappe.model.set_value(
                row.doctype,
                row.name,
                'custom_process_loss',
                frm.doc.custom_is_packaging_loss ? 1 : 0
            );
        });
        frm.refresh_field('items');
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
    },

    item_code(frm, cdt, cdn) {
        set_sfg_batch_to_fg(frm);
        calculate_pm_cost(frm);

        let items = frm.doc.items || [];

        if (items.length > 1) {
            let first_row_rate = flt(items[0].basic_rate);

            items.forEach((row, idx) => {
                if (idx === 0) return;

                frappe.model.set_value(
                    row.doctype,
                    row.name,
                    'custom_per_kg_cost_',
                    first_row_rate
                );

                calculate_row_values(frm, row.doctype, row.name);
            });
        }

        calculate_totals(frm);
        calculate_all(frm);

        let row = locals[cdt][cdn];
        if (row.item_code) {
            frappe.call({
                method: "frappe.client.get_list",
                args: {
                    doctype: "Batch",
                    filters: { item: row.item_code },
                    fields: ["name", "creation"],
                    order_by: "creation desc",
                    limit_page_length: 1
                },
                callback: function(r) {
                    if (r.message && r.message.length > 0) {
                        frappe.model.set_value(cdt, cdn, "custom_sfg_batch", r.message[0].name);
                    } else {
                        frappe.model.set_value(cdt, cdn, "custom_sfg_batch", "");
                    }
                }
            });
        }
    },

    batch_no(frm, cdt, cdn) {
        set_sfg_batch_to_fg(frm);
    },

    basic_rate(frm, cdt, cdn) {
        calculate_pm_cost(frm);
    },

    custom_packaging_item(frm) {
        calculate_pm_cost(frm);
    },

    qty(frm, cdt, cdn) {
        calculate_row_values(frm, cdt, cdn);
        calculate_totals(frm);
        calculate_all(frm);
    },

    custom_packet_size(frm, cdt, cdn) {
        calculate_row_values(frm, cdt, cdn);
        calculate_totals(frm);
    },

    custom_per_kg_cost_(frm, cdt, cdn) {
        calculate_row_values(frm, cdt, cdn);
        calculate_totals(frm);
    },

    custom_per_unit_pm_cost(frm, cdt, cdn) {
        calculate_row_values(frm, cdt, cdn);
        calculate_totals(frm);
    },

    custom_is_packaging_material(frm, cdt, cdn) {
        calculate_row_values(frm, cdt, cdn);
        calculate_totals(frm);
    },

    custom_total_kg_consumed(frm) {
        calculate_totals(frm);
    },

    custom_final_rate_after_loss(frm, cdt, cdn) {
        let row = locals[cdt][cdn];

        // 🔒 LOCK
        if (row.custom_is_packaging_material) return;

        let final_rate = flt(row.custom_final_rate_after_loss);
        if (final_rate > 0) {
            frappe.model.set_value(cdt, cdn, 'basic_rate', final_rate);
        }
    },

    custom__is_fg_item(frm, cdt, cdn) {
        calculate_all(frm);
    },

    custom_total_per_packet_fg_cost(frm, cdt, cdn) {
        calculate_distribution(frm);
    },

    custom_per_packet_fg_cost(frm, cdt, cdn) {
        calculate_distribution(frm);
    },

    custom_process_loss(frm, cdt, cdn) {
        toggle_process_loss_fields(frm, cdt, cdn);
    },

    form_render(frm, cdt, cdn) {
        toggle_process_loss_fields(frm, cdt, cdn);
    },

    items_add(frm, cdt, cdn) {
        calculate_pm_cost(frm);
        calculate_totals(frm);

        if (frm.doc.custom_is_packaging_loss) {
            frappe.model.set_value(cdt, cdn, 'custom_process_loss', 1);
        }
        toggle_process_loss_fields(frm, cdt, cdn);
    },

    items_remove(frm) {
        calculate_totals(frm);
        calculate_all(frm);
    }
});


// =============================================
// HELPER: Set field silently (no dirty flag)
// =============================================
function set_doc_value(frm, fieldname, value) {
    frm.doc[fieldname] = value;
    frm.refresh_field(fieldname);
}

function set_row_value(row, fieldname, value) {
    row[fieldname] = value;
}


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

    let fg_qty = flt(frm.doc._freeze_fg_qty || frm.doc.fg_completed_qty);

    // fg_completed_qty freeze rakho — direct assignment, no dirty
    frm.doc.fg_completed_qty = fg_qty;
    frm.refresh_field('fg_completed_qty');

    let process_loss = fg_qty - finished_qty;
    frm.doc.process_loss_qty = flt(process_loss, 3);
    frm.refresh_field('process_loss_qty');

    let loss_percentage = 0;
    if (fg_qty > 0) {
        loss_percentage = (process_loss / fg_qty) * 100;
    }
    frm.doc.process_loss_percentage = flt(loss_percentage, 2);
    frm.refresh_field('process_loss_percentage');
}


// =============================================
// CALCULATE ALL - user-interaction version (uses set_value → marks dirty, OK)
// =============================================
function calculate_all(frm) {
    if (frm.doc.stock_entry_type !== 'Manufacture') {
        // Non-manufacture path
        calculate_fg_total(frm);
        calculate_process_loss(frm);
        calculate_distribution(frm);
        return;
    }
    set_production_quantity(frm);
    set_byproduct_input(frm);
    set_byproduct_output(frm);
    set_finished_goods_quantity(frm);
    set_total_material_consumption(frm);
    set_total_output(frm);
    set_grinding_loss(frm);
    calculate_fg_total(frm);
    calculate_process_loss(frm);
    calculate_distribution(frm);
}


// =============================================
// CALCULATE ALL SILENT - after save/load (direct assignment, no dirty flag)
// =============================================
function calculate_all_silent(frm) {
    if (frm.doc.stock_entry_type !== 'Manufacture') {
        _calc_fg_total_silent(frm);
        _calc_process_loss_silent(frm);
        _calc_distribution_silent(frm);
        return;
    }
    _set_production_quantity_silent(frm);
    _set_byproduct_input_silent(frm);
    _set_byproduct_output_silent(frm);
    _set_finished_goods_quantity_silent(frm);
    _set_total_material_consumption_silent(frm);
    _set_total_output_silent(frm);
    _set_grinding_loss_silent(frm);
    _calc_fg_total_silent(frm);
    _calc_process_loss_silent(frm);
    _calc_distribution_silent(frm);

    // Refresh all computed fields at once
    frm.refresh_fields([
        'custom_production_quantity_kg',
        'custom_by_product_in_kg',
        'custom_by_product_out_kg',
        'custom_finished_goods_out_kg',
        'custom_total_material_in_bp_kg_consumption',
        'custom_total_output_kg',
        'custom_grinding_loss_kg',
        'custom_grinding_loss_',
        'custom_total_packets_produced',
        'custom_packaging_process_loss_'
    ]);
    frm.refresh_field('items');
}


// =============================================
// MANUFACTURE FIELD SETTERS — interactive (marks dirty, used on user actions)
// =============================================
function set_production_quantity(frm) {
    let total_qty = 0;
    (frm.doc.items || []).forEach(function(row) {
        if (row.s_warehouse && !row.custom_is_byproduct_item) {
            total_qty += flt(row.qty);
        }
    });
    frm.set_value('custom_production_quantity_kg', flt(total_qty, 3));
}

function set_byproduct_input(frm) {
    let byproduct_qty = 0;
    (frm.doc.items || []).forEach(function(row) {
        if (row.s_warehouse && row.custom_is_byproduct_item) {
            byproduct_qty += flt(row.qty);
        }
    });
    frm.set_value('custom_by_product_in_kg', flt(byproduct_qty, 3));
}

function set_byproduct_output(frm) {
    let byproduct_output_qty = 0;
    (frm.doc.items || []).forEach(function(row) {
        if (row.t_warehouse && row.custom_is_byproduct_item) {
            byproduct_output_qty += flt(row.qty);
        }
    });
    frm.set_value('custom_by_product_out_kg', flt(byproduct_output_qty, 3));
}

function set_finished_goods_quantity(frm) {
    let finished_qty = 0;
    (frm.doc.items || []).forEach(function(row) {
        if (row.t_warehouse && row.is_finished_item) {
            finished_qty += flt(row.qty);
        }
    });
    frm.set_value('custom_finished_goods_out_kg', flt(finished_qty, 3));
}

function set_total_material_consumption(frm) {
    let total =
        flt(frm.doc.custom_production_quantity_kg) +
        flt(frm.doc.custom_by_product_in_kg);
    frm.set_value('custom_total_material_in_bp_kg_consumption', flt(total, 3));
}

function set_total_output(frm) {
    let total =
        flt(frm.doc.custom_finished_goods_out_kg) +
        flt(frm.doc.custom_by_product_out_kg);
    frm.set_value('custom_total_output_kg', flt(total, 3));
}

function set_grinding_loss(frm) {
    let consumption = flt(frm.doc.custom_total_material_in_bp_kg_consumption);
    let output = flt(frm.doc.custom_total_output_kg);
    let loss = consumption - output;
    frm.set_value('custom_grinding_loss_kg', flt(loss, 3));
    let loss_percentage = consumption > 0 ? (loss / consumption) * 100 : 0;
    frm.set_value('custom_grinding_loss_', flt(loss_percentage, 2));
}


// =============================================
// MANUFACTURE FIELD SETTERS — silent (direct assign, no dirty)
// =============================================
function _set_production_quantity_silent(frm) {
    let total_qty = 0;
    (frm.doc.items || []).forEach(function(row) {
        if (row.s_warehouse && !row.custom_is_byproduct_item) {
            total_qty += flt(row.qty);
        }
    });
    frm.doc.custom_production_quantity_kg = flt(total_qty, 3);
}

function _set_byproduct_input_silent(frm) {
    let byproduct_qty = 0;
    (frm.doc.items || []).forEach(function(row) {
        if (row.s_warehouse && row.custom_is_byproduct_item) {
            byproduct_qty += flt(row.qty);
        }
    });
    frm.doc.custom_by_product_in_kg = flt(byproduct_qty, 3);
}

function _set_byproduct_output_silent(frm) {
    let byproduct_output_qty = 0;
    (frm.doc.items || []).forEach(function(row) {
        if (row.t_warehouse && row.custom_is_byproduct_item) {
            byproduct_output_qty += flt(row.qty);
        }
    });
    frm.doc.custom_by_product_out_kg = flt(byproduct_output_qty, 3);
}

function _set_finished_goods_quantity_silent(frm) {
    let finished_qty = 0;
    (frm.doc.items || []).forEach(function(row) {
        if (row.t_warehouse && row.is_finished_item) {
            finished_qty += flt(row.qty);
        }
    });
    frm.doc.custom_finished_goods_out_kg = flt(finished_qty, 3);
}

function _set_total_material_consumption_silent(frm) {
    frm.doc.custom_total_material_in_bp_kg_consumption = flt(
        flt(frm.doc.custom_production_quantity_kg) + flt(frm.doc.custom_by_product_in_kg), 3
    );
}

function _set_total_output_silent(frm) {
    frm.doc.custom_total_output_kg = flt(
        flt(frm.doc.custom_finished_goods_out_kg) + flt(frm.doc.custom_by_product_out_kg), 3
    );
}

function _set_grinding_loss_silent(frm) {
    let consumption = flt(frm.doc.custom_total_material_in_bp_kg_consumption);
    let output = flt(frm.doc.custom_total_output_kg);
    let loss = consumption - output;
    frm.doc.custom_grinding_loss_kg = flt(loss, 3);
    frm.doc.custom_grinding_loss_ = flt(consumption > 0 ? (loss / consumption) * 100 : 0, 2);
}

function _calc_fg_total_silent(frm) {
    let total = 0;
    (frm.doc.items || []).forEach(row => {
        if (row.custom__is_fg_item) total += flt(row.qty);
    });
    frm.doc.custom_total_packets_produced = flt(total, 4);
}

function _calc_process_loss_silent(frm) {
    let loss_qty = flt(frm.doc.custom_process_loss_quantity);
    let total_outgoing = flt(frm.doc.custom_total_outgoing_kg_sfg__);
    frm.doc.custom_packaging_process_loss_ = flt(
        total_outgoing > 0 ? (loss_qty / total_outgoing) * 100 : 0, 2
    );
}

function _calc_distribution_silent(frm) {
    let total_packets = flt(frm.doc.custom_total_packets_produced);
    let total_loss = flt(frm.doc.custom_packaging_loss_amount);

    (frm.doc.items || []).forEach(row => {
        if (row.custom_is_packaging_material) return;

        if (!row.custom__is_fg_item) {
            row.custom_distributed_process_loss = 0;
            row.custom_distributed_rate = 0;
            row.custom_final_rate_after_loss = 0;
            return;
        }

        let distribution = total_packets > 0 ? flt(row.qty) / total_packets : 0;
        let distributed_rate = distribution * total_loss;
        let total_per_packet = flt(row.custom_total_per_packet_fg_cost);
        let qty = flt(row.qty);
        let final_rate = qty > 0
            ? total_per_packet + (distributed_rate / qty)
            : total_per_packet;

        row.custom_distributed_process_loss = distribution;
        row.custom_distributed_rate = distributed_rate;
        row.custom_final_rate_after_loss = flt(final_rate, 8);
    });
}


// =============================================
// INTERACTIVE CALCULATE FUNCTIONS (used on user actions — dirty is OK)
// =============================================
function calculate_fg_total(frm) {
    let total = 0;
    (frm.doc.items || []).forEach(row => {
        if (row.custom__is_fg_item) total += flt(row.qty);
    });
    frm.set_value('custom_total_packets_produced', flt(total, 4));
}

function calculate_process_loss(frm) {
    let loss_qty = flt(frm.doc.custom_process_loss_quantity);
    let total_outgoing = flt(frm.doc.custom_total_outgoing_kg_sfg__);
    let result = total_outgoing > 0 ? (loss_qty / total_outgoing) * 100 : 0;
    frm.set_value('custom_packaging_process_loss_', flt(result, 2));
}

function calculate_distribution(frm) {
    let total_packets = flt(frm.doc.custom_total_packets_produced);
    let total_loss = flt(frm.doc.custom_packaging_loss_amount);

    (frm.doc.items || []).forEach(row => {
        if (row.custom_is_packaging_material) return;

        if (!row.custom__is_fg_item) {
            frappe.model.set_value(row.doctype, row.name, {
                custom_distributed_process_loss: 0,
                custom_distributed_rate: 0,
                custom_final_rate_after_loss: 0
            });
            return;
        }

        let distribution = total_packets > 0 ? flt(row.qty) / total_packets : 0;
        let distributed_rate = distribution * total_loss;
        let total_per_packet = flt(row.custom_total_per_packet_fg_cost);
        let qty = flt(row.qty);
        let final_rate = qty > 0
            ? total_per_packet + (distributed_rate / qty)
            : total_per_packet;

        frappe.model.set_value(row.doctype, row.name, {
            custom_distributed_process_loss: distribution,
            custom_distributed_rate: distributed_rate,
            custom_final_rate_after_loss: flt(final_rate, 8)
        });
    });
}


// =============================================
// SFG BATCH TO FG
// =============================================
function set_sfg_batch_to_fg(frm) {
    let sfg_item = frm.doc.items.find(row =>
        row.custom_is_sfg_item == 1 && row.batch_no
    );
    if (!sfg_item) return;

    let fg_items = frm.doc.items.filter(row => row.custom__is_fg_item == 1);
    if (!fg_items.length) return;

    fg_items.forEach(row => {
        frappe.model.set_value(row.doctype, row.name, 'custom_sfg_batch', sfg_item.batch_no);
    });
}


// =============================================
// PM COST
// =============================================
function calculate_pm_cost(frm) {
    let items = frm.doc.items || [];
    let pm_map = {};

    items.forEach(row => {
        if (row.custom_is_packaging_material && row.item_code) {
            pm_map[row.item_code] = flt(row.basic_rate);
        }
    });

    items.forEach(row => {
        if (row.custom_packaging_item && pm_map[row.custom_packaging_item] != null) {
            let new_val = flt(pm_map[row.custom_packaging_item]);
            if (row.custom_per_unit_pm_cost !== new_val) {
                frappe.model.set_value(row.doctype, row.name, 'custom_per_unit_pm_cost', new_val);
                calculate_row_values(frm, row.doctype, row.name);
            }
        }
    });
}


// =============================================
// ROW CALC
// =============================================
function calculate_row_values(frm, cdt, cdn) {
    let row = locals[cdt][cdn];

    let qty = flt(row.qty);
    let packet_size = flt(row.custom_packet_size);
    let per_kg = flt(row.custom_per_kg_cost_);
    let per_unit_pm = flt(row.custom_per_unit_pm_cost);

    let total_kg = qty * packet_size;
    frappe.model.set_value(cdt, cdn, 'custom_total_kg_consumed', total_kg);

    let per_packet_cost = packet_size * per_kg;
    frappe.model.set_value(cdt, cdn, 'custom_per_packet_fg_cost', per_packet_cost);

    // 🔒 LOCK
    if (row.custom_is_packaging_material) return;

    let items = frm.doc.items || [];
    let is_source_row = items.length > 0 && row.name === items[0].name;

    if (!is_source_row) {
        let total_per_packet = per_packet_cost + per_unit_pm;
        frappe.model.set_value(cdt, cdn, 'custom_total_per_packet_fg_cost', total_per_packet);

        let final_rate = flt(row.custom_final_rate_after_loss);
        frappe.model.set_value(cdt, cdn, 'basic_rate',
            final_rate > 0 ? final_rate : total_per_packet
        );
    }
}


// =============================================
// TOTALS
// =============================================
function calculate_totals(frm) {
    let fg_total = 0;
    let sfg_total = 0;
    let per_kg_cost = 0;

    (frm.doc.items || []).forEach(row => {
        if (row.custom__is_fg_item) {
            fg_total += flt(row.custom_total_kg_consumed);
            per_kg_cost = flt(row.custom_per_kg_cost_);
        }
        if (row.custom_is_sfg_item) {
            sfg_total += flt(row.qty);
        }
    });

    frm.set_value('custom_total_incoming_kg_fg', fg_total);
    frm.set_value('custom_total_outgoing_kg_sfg__', sfg_total);

    let process_loss = sfg_total - fg_total;
    frm.set_value('custom_process_loss_quantity', process_loss);

    let loss_amount = process_loss * per_kg_cost;
    frm.set_value('custom_packaging_loss_amount', loss_amount);

    frm.set_value('custom_is_packaging_loss', process_loss > 0 ? 1 : 0);
}


// =============================================
// TOGGLE PROCESS LOSS FIELDS
// =============================================
function toggle_process_loss_fields(frm, cdt, cdn) {
    var row = locals[cdt][cdn];
    if (row.custom_is_packaging_material) return;
    var show = row.custom_process_loss ? true : false;
    ['custom_distributed_process_loss', 'custom_distributed_rate', 'custom_final_rate_after_loss']
        .forEach(field => {
            frm.fields_dict['items'].grid.toggle_display(field, show);
        });
    frm.refresh_field('items');
}


// =============================================
// REFRESH ALL ROWS
// =============================================
function refresh_all_rows(frm) {
    (frm.doc.items || []).forEach(row => {
        toggle_process_loss_fields(frm, row.doctype, row.name);
    });
}
