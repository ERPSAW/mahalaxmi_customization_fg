// frappe.ui.form.on('Stock Entry', {

//     onload(frm) {
//         refresh_all_rows(frm);
//     },

//     validate(frm) {
//         calculate_pm_cost(frm);
//         calculate_all(frm);

//         (frm.doc.items || []).forEach(function(row) {

//             // 🔒 LOCK
//             if (row.custom_is_packaging_material) return;

//             let basic_rate = flt(row.basic_rate);
//             if (basic_rate > 0) {
//                 frappe.model.set_value(
//                     row.doctype,
//                     row.name,
//                     'custom_final_rate_after_loss',
//                     basic_rate
//                 );
//             }
//         });
//     },

//     items_add(frm) {
//         calculate_pm_cost(frm);
//         calculate_totals(frm);
//     },

//     custom_process_loss_quantity(frm) {
//         calculate_process_loss(frm);
//         calculate_distribution(frm);
//     },

//     custom_total_outgoing_kg_sfg__(frm) {
//         calculate_process_loss(frm);
//     },

//     custom_packaging_loss_amount(frm) {
//         calculate_distribution(frm);
//     },

//     custom_is_packaging_loss(frm) {
//         frm.doc.items.forEach(function(row) {
//             frappe.model.set_value(
//                 row.doctype,
//                 row.name,
//                 'custom_process_loss',
//                 frm.doc.custom_is_packaging_loss ? 1 : 0
//             );
//         });
//         frm.refresh_field('items');
//     }

// });


// // =======================
// // CHILD TABLE
// // =======================
// frappe.ui.form.on('Stock Entry Detail', {

//     item_code(frm, cdt, cdn) {
//         calculate_pm_cost(frm);

//         let items = frm.doc.items || [];

//         if (items.length > 1) {
//             let first_row_rate = flt(items[0].basic_rate);

//             items.forEach((row, idx) => {
//                 if (idx === 0) return;

//                 frappe.model.set_value(
//                     row.doctype,
//                     row.name,
//                     'custom_per_kg_cost_',
//                     first_row_rate
//                 );

//                 calculate_row_values(frm, row.doctype, row.name);
//             });
//         }

//         calculate_totals(frm);
//         calculate_all(frm);

//         let row = locals[cdt][cdn];
//         if (row.item_code) {
//             frappe.call({
//                 method: "frappe.client.get_list",
//                 args: {
//                     doctype: "Batch",
//                     filters: { item: row.item_code },
//                     fields: ["name", "creation"],
//                     order_by: "creation desc",
//                     limit_page_length: 1
//                 },
//                 callback: function(r) {
//                     if (r.message && r.message.length > 0) {
//                         frappe.model.set_value(cdt, cdn, "custom_sfg_batch", r.message[0].name);
//                     } else {
//                         frappe.model.set_value(cdt, cdn, "custom_sfg_batch", "");
//                     }
//                 }
//             });
//         }
//     },

//     basic_rate(frm, cdt, cdn) {
//         calculate_pm_cost(frm);
//     },

//     custom_packaging_item(frm) {
//         calculate_pm_cost(frm);
//     },

//     qty(frm, cdt, cdn) {
//         calculate_row_values(frm, cdt, cdn);
//         calculate_totals(frm);
//         calculate_all(frm);
//     },

//     custom_packet_size(frm, cdt, cdn) {
//         calculate_row_values(frm, cdt, cdn);
//         calculate_totals(frm);
//     },

//     custom_per_kg_cost_(frm, cdt, cdn) {
//         calculate_row_values(frm, cdt, cdn);
//         calculate_totals(frm);
//     },

//     custom_per_unit_pm_cost(frm, cdt, cdn) {
//         calculate_row_values(frm, cdt, cdn);
//         calculate_totals(frm);
//     },

//     custom_is_packaging_material(frm, cdt, cdn) {
//         calculate_row_values(frm, cdt, cdn);
//         calculate_totals(frm);
//     },

//     custom_total_kg_consumed(frm) {
//         calculate_totals(frm);
//     },

//     custom_final_rate_after_loss(frm, cdt, cdn) {
//         let row = locals[cdt][cdn];

//         // 🔒 LOCK
//         if (row.custom_is_packaging_material) return;

//         let final_rate = flt(row.custom_final_rate_after_loss);
//         if (final_rate > 0) {
//             frappe.model.set_value(cdt, cdn, 'basic_rate', final_rate);
//         }
//     },

//     custom__is_fg_item(frm, cdt, cdn) {
//         calculate_all(frm);
//     },

//     custom_total_per_packet_fg_cost(frm, cdt, cdn) {
//         calculate_distribution(frm);
//     },

//     custom_per_packet_fg_cost(frm, cdt, cdn) {
//         calculate_distribution(frm);
//     },

//     custom_process_loss(frm, cdt, cdn) {
//         toggle_process_loss_fields(frm, cdt, cdn);
//     },

//     form_render(frm, cdt, cdn) {
//         toggle_process_loss_fields(frm, cdt, cdn);
//     },

//     items_add(frm, cdt, cdn) {
//         calculate_pm_cost(frm);
//         calculate_totals(frm);

//         if (frm.doc.custom_is_packaging_loss) {
//             frappe.model.set_value(cdt, cdn, 'custom_process_loss', 1);
//         }
//         toggle_process_loss_fields(frm, cdt, cdn);
//     },

//     items_remove(frm) {
//         calculate_totals(frm);
//         calculate_all(frm);
//     }

// });


// // =======================
// // PM COST
// // =======================
// function calculate_pm_cost(frm) {
//     let items = frm.doc.items || [];
//     let pm_map = {};

//     items.forEach(row => {
//         if (row.custom_is_packaging_material && row.item_code) {
//             pm_map[row.item_code] = flt(row.basic_rate);
//         }
//     });

//     items.forEach(row => {
//         if (row.custom_packaging_item && pm_map[row.custom_packaging_item] != null) {
//             let new_val = flt(pm_map[row.custom_packaging_item]);

//             if (row.custom_per_unit_pm_cost !== new_val) {
//                 frappe.model.set_value(row.doctype, row.name, 'custom_per_unit_pm_cost', new_val);
//                 calculate_row_values(frm, row.doctype, row.name);
//             }
//         }
//     });
// }


// // =======================
// // ROW CALC
// // =======================
// function calculate_row_values(frm, cdt, cdn) {
//     let row = locals[cdt][cdn];

//     let qty = flt(row.qty);
//     let packet_size = flt(row.custom_packet_size);
//     let per_kg = flt(row.custom_per_kg_cost_);
//     let per_unit_pm = flt(row.custom_per_unit_pm_cost);

//     let total_kg = qty * packet_size;
//     frappe.model.set_value(cdt, cdn, 'custom_total_kg_consumed', total_kg);

//     let per_packet_cost = packet_size * per_kg;
//     frappe.model.set_value(cdt, cdn, 'custom_per_packet_fg_cost', per_packet_cost);

//     // 🔒 LOCK
//     if (row.custom_is_packaging_material) return;

//     let items = frm.doc.items || [];
//     let is_source_row = items.length > 0 && row.name === items[0].name;

//     if (!is_source_row) {
//         let total_per_packet = per_packet_cost + per_unit_pm;
//         frappe.model.set_value(cdt, cdn, 'custom_total_per_packet_fg_cost', total_per_packet);

//         let final_rate = flt(row.custom_final_rate_after_loss);
//         frappe.model.set_value(cdt, cdn, 'basic_rate',
//             final_rate > 0 ? final_rate : total_per_packet
//         );
//     }
// }


// // =======================
// // TOTALS
// // =======================
// function calculate_totals(frm) {
//     let fg_total = 0;
//     let sfg_total = 0;
//     let per_kg_cost = 0;

//     (frm.doc.items || []).forEach(row => {
//         if (row.custom__is_fg_item) {
//             fg_total += flt(row.custom_total_kg_consumed);
//             per_kg_cost = flt(row.custom_per_kg_cost_);
//         }
//         if (row.custom_is_sfg_item) {
//             sfg_total += flt(row.qty);
//         }
//     });

//     frm.set_value('custom_total_incoming_kg_fg', fg_total);
//     frm.set_value('custom_total_outgoing_kg_sfg__', sfg_total);

//     let process_loss = sfg_total - fg_total;
//     frm.set_value('custom_process_loss_quantity', process_loss);

//     let loss_amount = process_loss * per_kg_cost;
//     frm.set_value('custom_packaging_loss_amount', loss_amount);

//     frm.set_value('custom_is_packaging_loss', process_loss > 0 ? 1 : 0);
// }


// // =======================
// // MAIN
// // =======================
// function calculate_all(frm) {
//     calculate_fg_total(frm);
//     calculate_process_loss(frm);
//     calculate_distribution(frm);
// }


// // =======================
// function calculate_fg_total(frm) {
//     let total = 0;
//     (frm.doc.items || []).forEach(row => {
//         if (row.custom__is_fg_item) {
//             total += flt(row.qty);
//         }
//     });
//     frm.set_value('custom_total_packets_produced', flt(total, 4));
// }


// // =======================
// function calculate_process_loss(frm) {
//     let loss_qty = flt(frm.doc.custom_process_loss_quantity);
//     let total_outgoing = flt(frm.doc.custom_total_outgoing_kg_sfg__);
//     let result = total_outgoing > 0 ? (loss_qty / total_outgoing) * 100 : 0;
//     frm.set_value('custom_packaging_process_loss_', flt(result, 2));
// }


// // =======================
// function calculate_distribution(frm) {

//     let total_packets = flt(frm.doc.custom_total_packets_produced);
//     let total_loss = flt(frm.doc.custom_packaging_loss_amount);

//     (frm.doc.items || []).forEach(row => {

//         // 🔒 LOCK
//         if (row.custom_is_packaging_material) return;

//         if (!row.custom__is_fg_item) {
//             frappe.model.set_value(row.doctype, row.name, {
//                 custom_distributed_process_loss: 0,
//                 custom_distributed_rate: 0,
//                 custom_final_rate_after_loss: 0
//             });
//             return;
//         }

//         let distribution = total_packets > 0 ? flt(row.qty) / total_packets : 0;

//         let distributed_rate = distribution * total_loss;

//         let total_per_packet = flt(row.custom_total_per_packet_fg_cost);
//         let qty = flt(row.qty);

//         let final_rate = qty > 0
//             ? total_per_packet + (distributed_rate / qty)
//             : total_per_packet;

//         frappe.model.set_value(row.doctype, row.name, {
//             custom_distributed_process_loss: distribution,
//             custom_distributed_rate: distributed_rate,
//             custom_final_rate_after_loss: flt(final_rate, 2)
//         });
//     });
// }


// // =======================
// function toggle_process_loss_fields(frm, cdt, cdn) {
//     var row = locals[cdt][cdn];

//     if (row.custom_is_packaging_material) return;

//     var show = row.custom_process_loss ? true : false;

//     ['custom_distributed_process_loss','custom_distributed_rate','custom_final_rate_after_loss']
//     .forEach(field => {
//         frm.fields_dict['items'].grid.toggle_display(field, show);
//     });

//     frm.refresh_field('items');
// }


// // =======================
// function refresh_all_rows(frm) {
//     (frm.doc.items || []).forEach(row => {
//         toggle_process_loss_fields(frm, row.doctype, row.name);
//     });
// }




frappe.ui.form.on('Stock Entry', {
    onload(frm) {
        refresh_all_rows(frm);
    },
    validate(frm) {
        calculate_pm_cost(frm);
        calculate_all(frm);
        (frm.doc.items || []).forEach(function(row) {
            if (row.custom_is_packaging_material) return;
            let basic_rate = flt(row.basic_rate);
            if (basic_rate > 0) {
                frappe.model.set_value(
                    row.doctype,
                    row.name,
                    'custom_final_rate_after_loss',
                    basic_rate
                );
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

// =======================
// CHILD TABLE
// =======================
frappe.ui.form.on('Stock Entry Detail', {
    item_code(frm, cdt, cdn) {
        calculate_pm_cost(frm);
        let items = frm.doc.items || [];
        if (items.length > 1) {
            let first_row_rate = flt(items[0].basic_rate);
            items.forEach((row, idx) => {
                if (idx === 0) return;
                if (row.custom_is_packaging_material) return;
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
    basic_rate(frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        if (row.custom_is_packaging_material) return;
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
    custom_per_packet_fg_cost(frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        if (row.custom_is_packaging_material) {
            frappe.model.set_value(cdt, cdn, 'custom_per_packet_fg_cost', 0);
            return;
        }
    },
    custom_final_rate_after_loss(frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        if (row.custom_is_packaging_material) return;
        let final_rate = flt(row.custom_final_rate_after_loss);
        if (final_rate > 0) {
            frappe.model.set_value(cdt, cdn, 'basic_rate', final_rate);
        }
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

// =======================
// PM COST
// =======================
function calculate_pm_cost(frm) {
    let items = frm.doc.items || [];
    let pm_map = {};
    items.forEach(row => {
        if (row.custom_is_packaging_material && row.item_code) {
            pm_map[row.item_code] = flt(row.basic_rate);
        }
    });
    items.forEach(row => {
        if (row.custom_is_packaging_material) return;
        if (row.custom_packaging_item && pm_map[row.custom_packaging_item] != null) {
            let new_val = flt(pm_map[row.custom_packaging_item]);
            frappe.model.set_value(row.doctype, row.name, 'custom_per_unit_pm_cost', new_val);
            calculate_row_values(frm, row.doctype, row.name);
        }
    });
}

// =======================
// ROW CALC
// =======================
function calculate_row_values(frm, cdt, cdn) {
    let row = locals[cdt][cdn];
    if (row.custom_is_packaging_material) {
        return;
    }
    let qty = flt(row.qty);
    let packet_size = flt(row.custom_packet_size);
    let per_kg = flt(row.custom_per_kg_cost_);
    let per_unit_pm = flt(row.custom_per_unit_pm_cost);
    let total_kg = qty * packet_size;
    frappe.model.set_value(cdt, cdn, 'custom_total_kg_consumed', total_kg);
    let per_packet_cost = packet_size * per_kg;
    frappe.model.set_value(cdt, cdn, 'custom_per_packet_fg_cost', per_packet_cost);
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

// =======================
// TOTALS
// =======================
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

// =======================
function calculate_all(frm) {
    calculate_fg_total(frm);
    calculate_process_loss(frm);
    calculate_distribution(frm);
}

// =======================
function calculate_fg_total(frm) {
    let total = 0;
    (frm.doc.items || []).forEach(row => {
        if (row.custom__is_fg_item) {
            total += flt(row.qty);
        }
    });
    frm.set_value('custom_total_packets_produced', flt(total, 4));
}

// =======================
function calculate_process_loss(frm) {
    let loss_qty = flt(frm.doc.custom_process_loss_quantity);
    let total_outgoing = flt(frm.doc.custom_total_outgoing_kg_sfg__);
    let result = total_outgoing > 0 ? (loss_qty / total_outgoing) * 100 : 0;
    frm.set_value('custom_packaging_process_loss_', flt(result, 2));
}

// =======================
// ✅ FIXED: Direct calculate, no dependency on saved field
// =======================
function calculate_distribution(frm) {
    let total_packets = flt(frm.doc.custom_total_packets_produced);
    let total_loss = flt(frm.doc.custom_packaging_loss_amount);

    (frm.doc.items || []).forEach(row => {
        // 🔒 LOCK
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

        // ✅ FIX: Directly calculate karo — async set_value pe depend mat karo
        let packet_size = flt(row.custom_packet_size);
        let per_kg = flt(row.custom_per_kg_cost_);
        let per_unit_pm = flt(row.custom_per_unit_pm_cost);
        let per_packet_fg_cost = packet_size * per_kg;
        let total_per_packet = per_packet_fg_cost + per_unit_pm;

        let qty = flt(row.qty);
        let final_rate = qty > 0
            ? total_per_packet + (distributed_rate / qty)
            : total_per_packet;

        frappe.model.set_value(row.doctype, row.name, {
            custom_distributed_process_loss: flt(distribution, 4),
            custom_distributed_rate: flt(distributed_rate, 4),
            custom_final_rate_after_loss: flt(final_rate, 4)
        });
    });
}

// =======================
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

// =======================
function refresh_all_rows(frm) {
    (frm.doc.items || []).forEach(row => {
        toggle_process_loss_fields(frm, row.doctype, row.name);
    });
}
