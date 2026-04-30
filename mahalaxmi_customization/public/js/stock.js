



// // // =======================
// // // Parent Form
// // // =======================
// frappe.ui.form.on('Stock Entry', {

//     refresh(frm) {
//         calculate_pm_cost(frm);
//         calculate_totals(frm);
//         set_sfg_batch(frm);
//     },

//     validate(frm) {
//         calculate_pm_cost(frm);
//     },

//     items_add(frm) {
//         calculate_pm_cost(frm);
//         calculate_totals(frm);
//         set_sfg_batch(frm);
//     }

// });


// // =======================
// // Child Table Events
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
//         set_sfg_batch(frm);

//         // Latest batch fetch karke custom_sfg_batch me set karo
//         let row = locals[cdt][cdn];
//         if (row.item_code) {
//             frappe.call({
//                 method: "frappe.client.get_list",
//                 args: {
//                     doctype: "Batch",
//                     filters: {
//                         item: row.item_code
//                     },
//                     fields: ["name", "creation"],
//                     order_by: "creation desc",
//                     limit_page_length: 1
//                 },
//                 callback: function(r) {
//                     if (r.message && r.message.length > 0) {
//                         let batch = r.message[0].name;
//                         frappe.model.set_value(cdt, cdn, "custom_sfg_batch", batch);
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

//     custom_packaging_item(frm, cdt, cdn) {
//         calculate_pm_cost(frm);
//         set_sfg_batch(frm);
//     },

//     qty(frm, cdt, cdn) {
//         calculate_row_values(frm, cdt, cdn);
//         calculate_totals(frm);
//     },

//     custom_packet_size(frm, cdt, cdn) {
//         calculate_row_values(frm, cdt, cdn);
//         calculate_totals(frm);
//     },

//     custom_per_kg_cost_(frm, cdt, cdn) {
//         calculate_row_values(frm, cdt, cdn);
//         calculate_totals(frm);
//     },

//     // Sirf jab user manually ya PM cost se value aaye tab trigger hoga
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

//     items_add(frm) {
//         calculate_pm_cost(frm);
//         calculate_totals(frm);
//         set_sfg_batch(frm);
//     },

//     items_remove(frm) {
//         calculate_totals(frm);
//     }

// });


// // =======================
// // PM COST LOGIC
// // =======================
// function calculate_pm_cost(frm) {

//     let items = frm.doc.items || [];

//     let pm_map = {};

//     items.forEach(row => {
//         if (row.custom_is_packaging_material && row.item_code) {
//             pm_map[row.item_code] = flt(row.basic_rate);
//         }
//     });

//     let changed = false;

//     items.forEach(row => {
//         if (row.custom_packaging_item && pm_map[row.custom_packaging_item] != null) {

//             let new_val = flt(pm_map[row.custom_packaging_item]);

//             if (row.custom_per_unit_pm_cost !== new_val) {
//                 row.custom_per_unit_pm_cost = new_val;
//                 changed = true;
//             }
//         }
//     });

//     if (changed) {
//         frm.refresh_field("items");
//     }
// }


// // =======================
// // Row Level Calculation
// // =======================
// function calculate_row_values(frm, cdt, cdn) {

//     let row = locals[cdt][cdn];

//     let qty         = flt(row.qty);
//     let packet_size = flt(row.custom_packet_size);
//     let per_kg      = flt(row.custom_per_kg_cost_);
//     let per_unit_pm = flt(row.custom_per_unit_pm_cost);

//     // Total KG consumed — hamesha calculate karo
//     let total_kg = qty * packet_size;
//     frappe.model.set_value(cdt, cdn, 'custom_total_kg_consumed', total_kg);

//     // Per packet FG cost (without PM) — hamesha calculate karo
//     let per_packet_cost = packet_size * per_kg;
//     frappe.model.set_value(cdt, cdn, 'custom_per_packet_fg_cost', per_packet_cost);

//     // Source row (first row) ke liye basic_rate update nahi karna
//     let items = frm.doc.items || [];
//     let is_source_row = items.length > 0 && row.name === items[0].name;

//     if (!is_source_row) {

//         if (per_unit_pm > 0) {
//             // ✅ Is row mein custom_per_unit_pm_cost ki value hai tabhi:
//             // custom_total_per_packet_fg_cost = per_packet_cost + per_unit_pm
//             // basic_rate = custom_total_per_packet_fg_cost
//             let total_per_packet = per_packet_cost + per_unit_pm;
//             frappe.model.set_value(cdt, cdn, 'custom_total_per_packet_fg_cost', total_per_packet);
//             frappe.model.set_value(cdt, cdn, 'basic_rate', total_per_packet);

//         } else {
//             // ✅ custom_per_unit_pm_cost nahi hai:
//             // custom_total_per_packet_fg_cost = 0 (clear)
//             // basic_rate = sirf per_packet_cost
//             frappe.model.set_value(cdt, cdn, 'custom_total_per_packet_fg_cost', 0);

//             if (per_packet_cost > 0) {
//                 frappe.model.set_value(cdt, cdn, 'basic_rate', per_packet_cost);
//             }
//         }
//     }
// }


// // =======================
// // Batch Auto Set
// // =======================
// function set_sfg_batch(frm) {

//     (frm.doc.items || []).forEach(function(row) {

//         if (row.custom_packaging_item && row.item_code) {

//             let match = row.item_code.match(/(\d{4})$/);
//             let last_digits = match ? match[1] : "";

//             if (last_digits) {

//                 let today    = frappe.datetime.get_today();
//                 let date_obj = new Date(today);

//                 let month = ("0" + (date_obj.getMonth() + 1)).slice(-2);
//                 let year  = date_obj.getFullYear().toString().slice(-2);

//                 let batch_name = `RM/${month}/${year}/${last_digits}`;

//                 frappe.model.set_value(
//                     row.doctype,
//                     row.name,
//                     'custom_sfg_batch',
//                     batch_name
//                 );
//             }
//         }
//     });
// }


// // =======================
// // Total Calculation
// // =======================
// function calculate_totals(frm) {

//     let fg_total    = 0;
//     let sfg_total   = 0;
//     let per_kg_cost = 0;

//     (frm.doc.items || []).forEach(function(row) {

//         if (row.custom__is_fg_item) {
//             fg_total    += flt(row.custom_total_kg_consumed);
//             per_kg_cost  = flt(row.custom_per_kg_cost_);
//         }

//         if (row.custom_is_sfg_item) {
//             sfg_total += flt(row.qty);
//         }
//     });

//     frm.set_value('custom_total_incoming_kg_fg',    fg_total);
//     frm.set_value('custom_total_outgoing_kg_sfg__', sfg_total);

//     let process_loss = sfg_total - fg_total;
//     frm.set_value('custom_process_loss_quantity', process_loss);

//     let loss_amount = process_loss * per_kg_cost;
//     frm.set_value('custom_packaging_loss_amount', loss_amount);

//     frm.set_value('custom_is_packaging_loss', process_loss > 0 ? 1 : 0);
// }


// // =======================
// // Parent Form
// // =======================
// frappe.ui.form.on('Stock Entry', {

//     refresh(frm) {
//         calculate_pm_cost(frm);
//         calculate_totals(frm);
//         set_sfg_batch(frm);
//     },

//     validate(frm) {
//         calculate_pm_cost(frm);
//     },

//     items_add(frm) {
//         calculate_pm_cost(frm);
//         calculate_totals(frm);
//         set_sfg_batch(frm);
//     }

// });


// // =======================
// // Child Table Events
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
//         set_sfg_batch(frm);

//         // Latest batch fetch
//         let row = locals[cdt][cdn];
//         if (row.item_code) {
//             frappe.call({
//                 method: "frappe.client.get_list",
//                 args: {
//                     doctype: "Batch",
//                     filters: {
//                         item: row.item_code
//                     },
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

//     basic_rate(frm) {
//         calculate_pm_cost(frm);
//     },

//     custom_packaging_item(frm) {
//         calculate_pm_cost(frm);
//         set_sfg_batch(frm);
//     },

//     qty(frm, cdt, cdn) {
//         calculate_row_values(frm, cdt, cdn);
//         calculate_totals(frm);
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

//     items_add(frm) {
//         calculate_pm_cost(frm);
//         calculate_totals(frm);
//         set_sfg_batch(frm);
//     },

//     items_remove(frm) {
//         calculate_totals(frm);
//     }

// });


// // =======================
// // ✅ PM COST LOGIC (FIXED)
// // =======================
// function calculate_pm_cost(frm) {

//     let items = frm.doc.items || [];
//     let pm_map = {};

//     // Step 1: Collect PM rates
//     items.forEach(row => {
//         if (row.custom_is_packaging_material && row.item_code) {
//             pm_map[row.item_code] = flt(row.basic_rate);
//         }
//     });

//     // Step 2: Apply PM cost to rows
//     items.forEach(row => {

//         if (row.custom_packaging_item && pm_map[row.custom_packaging_item] != null) {

//             let new_val = flt(pm_map[row.custom_packaging_item]);

//             if (row.custom_per_unit_pm_cost !== new_val) {

//                 frappe.model.set_value(
//                     row.doctype,
//                     row.name,
//                     'custom_per_unit_pm_cost',
//                     new_val
//                 );

//                 // 🔥 तुरन्त calculation trigger
//                 calculate_row_values(frm, row.doctype, row.name);
//             }
//         }
//     });
// }


// // =======================
// // Row Level Calculation
// // =======================
// function calculate_row_values(frm, cdt, cdn) {

//     let row = locals[cdt][cdn];

//     let qty         = flt(row.qty);
//     let packet_size = flt(row.custom_packet_size);
//     let per_kg      = flt(row.custom_per_kg_cost_);
//     let per_unit_pm = flt(row.custom_per_unit_pm_cost);

//     let total_kg = qty * packet_size;
//     frappe.model.set_value(cdt, cdn, 'custom_total_kg_consumed', total_kg);

//     let per_packet_cost = packet_size * per_kg;
//     frappe.model.set_value(cdt, cdn, 'custom_per_packet_fg_cost', per_packet_cost);

//     let items = frm.doc.items || [];
//     let is_source_row = items.length > 0 && row.name === items[0].name;

//     if (!is_source_row) {

//         if (per_unit_pm > 0) {

//             let total_per_packet = per_packet_cost + per_unit_pm;

//             frappe.model.set_value(cdt, cdn, 'custom_total_per_packet_fg_cost', total_per_packet);
//             frappe.model.set_value(cdt, cdn, 'basic_rate', total_per_packet);

//         } else {

//             frappe.model.set_value(cdt, cdn, 'custom_total_per_packet_fg_cost', 0);

//             if (per_packet_cost > 0) {
//                 frappe.model.set_value(cdt, cdn, 'basic_rate', per_packet_cost);
//             }
//         }
//     }
// }


// // =======================
// // Batch Auto Set
// // =======================
// function set_sfg_batch(frm) {

//     (frm.doc.items || []).forEach(function(row) {

//         if (row.custom_packaging_item && row.item_code) {

//             let match = row.item_code.match(/(\d{4})$/);
//             let last_digits = match ? match[1] : "";

//             if (last_digits) {

//                 let today    = frappe.datetime.get_today();
//                 let date_obj = new Date(today);

//                 let month = ("0" + (date_obj.getMonth() + 1)).slice(-2);
//                 let year  = date_obj.getFullYear().toString().slice(-2);

//                 let batch_name = `RM/${month}/${year}/${last_digits}`;

//                 frappe.model.set_value(
//                     row.doctype,
//                     row.name,
//                     'custom_sfg_batch',
//                     batch_name
//                 );
//             }
//         }
//     });
// }


// // =======================
// // Total Calculation
// // =======================
// function calculate_totals(frm) {

//     let fg_total    = 0;
//     let sfg_total   = 0;
//     let per_kg_cost = 0;

//     (frm.doc.items || []).forEach(function(row) {

//         if (row.custom__is_fg_item) {
//             fg_total    += flt(row.custom_total_kg_consumed);
//             per_kg_cost  = flt(row.custom_per_kg_cost_);
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
// // Parent Form
// // =======================
// frappe.ui.form.on('Stock Entry', {

//     refresh(frm) {
//         // calculate_pm_cost(frm);
//         // calculate_totals(frm);
//         // set_sfg_batch(frm);
//     },

//     validate(frm) {
//         // calculate_pm_cost(frm);
//     },

//     items_add(frm) {
//         calculate_pm_cost(frm);
//         calculate_totals(frm);
//         set_sfg_batch(frm);
//     }

// });


// // =======================
// // Child Table Events
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
//         set_sfg_batch(frm);

//         // Latest batch fetch
//         let row = locals[cdt][cdn];
//         if (row.item_code) {
//             frappe.call({
//                 method: "frappe.client.get_list",
//                 args: {
//                     doctype: "Batch",
//                     filters: {
//                         item: row.item_code
//                     },
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

//     basic_rate(frm) {
//         calculate_pm_cost(frm);
//     },

//     custom_packaging_item(frm) {
//         calculate_pm_cost(frm);
//         set_sfg_batch(frm);
//     },

//     qty(frm, cdt, cdn) {
//         calculate_row_values(frm, cdt, cdn);
//         calculate_totals(frm);
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

//     // ✅ Jab custom_final_rate_after_loss change ho, basic_rate update karo
//     custom_final_rate_after_loss(frm, cdt, cdn) {
//         let row = locals[cdt][cdn];
//         let final_rate = flt(row.custom_final_rate_after_loss);
//         if (final_rate > 0) {
//             frappe.model.set_value(cdt, cdn, 'basic_rate', final_rate);
//         }
//     },

//     items_add(frm) {
//         calculate_pm_cost(frm);
//         calculate_totals(frm);
//         set_sfg_batch(frm);
//     },

//     items_remove(frm) {
//         calculate_totals(frm);
//     }

// });


// // =======================
// // ✅ PM COST LOGIC (FIXED)
// // =======================
// function calculate_pm_cost(frm) {

//     let items = frm.doc.items || [];
//     let pm_map = {};

//     // Step 1: Collect PM rates
//     items.forEach(row => {
//         if (row.custom_is_packaging_material && row.item_code) {
//             pm_map[row.item_code] = flt(row.basic_rate);
//         }
//     });

//     // Step 2: Apply PM cost to rows
//     items.forEach(row => {

//         if (row.custom_packaging_item && pm_map[row.custom_packaging_item] != null) {

//             let new_val = flt(pm_map[row.custom_packaging_item]);

//             if (row.custom_per_unit_pm_cost !== new_val) {

//                 frappe.model.set_value(
//                     row.doctype,
//                     row.name,
//                     'custom_per_unit_pm_cost',
//                     new_val
//                 );

//                 calculate_row_values(frm, row.doctype, row.name);
//             }
//         }
//     });
// }


// // =======================
// // Row Level Calculation
// // =======================
// function calculate_row_values(frm, cdt, cdn) {

//     let row = locals[cdt][cdn];

//     let qty         = flt(row.qty);
//     let packet_size = flt(row.custom_packet_size);
//     let per_kg      = flt(row.custom_per_kg_cost_);
//     let per_unit_pm = flt(row.custom_per_unit_pm_cost);

//     let total_kg = qty * packet_size;
//     frappe.model.set_value(cdt, cdn, 'custom_total_kg_consumed', total_kg);

//     let per_packet_cost = packet_size * per_kg;
//     frappe.model.set_value(cdt, cdn, 'custom_per_packet_fg_cost', per_packet_cost);

//     let items = frm.doc.items || [];
//     let is_source_row = items.length > 0 && row.name === items[0].name;

//     if (!is_source_row) {

//         if (per_unit_pm > 0) {

//             let total_per_packet = per_packet_cost + per_unit_pm;

//             frappe.model.set_value(cdt, cdn, 'custom_total_per_packet_fg_cost', total_per_packet);

//             // ✅ Pehle custom_final_rate_after_loss check karo, warna total_per_packet use karo
//             let final_rate = flt(row.custom_final_rate_after_loss);
//             frappe.model.set_value(cdt, cdn, 'basic_rate', final_rate > 0 ? final_rate : total_per_packet);

//         } else {

//             frappe.model.set_value(cdt, cdn, 'custom_total_per_packet_fg_cost', 0);

//             if (per_packet_cost > 0) {
//                 // ✅ Pehle custom_final_rate_after_loss check karo, warna per_packet_cost use karo
//                 let final_rate = flt(row.custom_final_rate_after_loss);
//                 frappe.model.set_value(cdt, cdn, 'basic_rate', final_rate > 0 ? final_rate : per_packet_cost);
//             }
//         }
//     }
// }


// // =======================
// // Batch Auto Set
// // =======================
// function set_sfg_batch(frm) {

//     (frm.doc.items || []).forEach(function(row) {

//         if (row.custom_packaging_item && row.item_code) {

//             let match = row.item_code.match(/(\d{4})$/);
//             let last_digits = match ? match[1] : "";

//             if (last_digits) {

//                 let today    = frappe.datetime.get_today();
//                 let date_obj = new Date(today);

//                 let month = ("0" + (date_obj.getMonth() + 1)).slice(-2);
//                 let year  = date_obj.getFullYear().toString().slice(-2);

//                 let batch_name = `RM/${month}/${year}/${last_digits}`;

//                 frappe.model.set_value(
//                     row.doctype,
//                     row.name,
//                     'custom_sfg_batch',
//                     batch_name
//                 );
//             }
//         }
//     });
// }


// // =======================
// // Total Calculation
// // =======================
// function calculate_totals(frm) {

//     let fg_total    = 0;
//     let sfg_total   = 0;
//     let per_kg_cost = 0;

//     (frm.doc.items || []).forEach(function(row) {

//         if (row.custom__is_fg_item) {
//             fg_total    += flt(row.custom_total_kg_consumed);
//             per_kg_cost  = flt(row.custom_per_kg_cost_);
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








// =======================
// Parent Form Events
// =======================
frappe.ui.form.on('Stock Entry', {

    refresh(frm) {
        calculate_all(frm);
    },

    validate(frm) {
        calculate_pm_cost(frm);
        calculate_all(frm);
    },

    items_add(frm) {
        calculate_pm_cost(frm);
        calculate_totals(frm);
        set_sfg_batch(frm);
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
    }

});


// =======================
// Child Table Events
// =======================
frappe.ui.form.on('Stock Entry Detail', {

    item_code(frm, cdt, cdn) {

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
        set_sfg_batch(frm);
        calculate_all(frm);

        // Latest batch fetch
        let row = locals[cdt][cdn];
        if (row.item_code) {
            frappe.call({
                method: "frappe.client.get_list",
                args: {
                    doctype: "Batch",
                    filters: {
                        item: row.item_code
                    },
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

    basic_rate(frm) {
        calculate_pm_cost(frm);
    },

    custom_packaging_item(frm) {
        calculate_pm_cost(frm);
        set_sfg_batch(frm);
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

    items_add(frm) {
        calculate_pm_cost(frm);
        calculate_totals(frm);
        set_sfg_batch(frm);
    },

    items_remove(frm) {
        calculate_totals(frm);
        calculate_all(frm);
    }

});


// =======================
// PM Cost Logic
// =======================
function calculate_pm_cost(frm) {

    let items = frm.doc.items || [];
    let pm_map = {};

    // Step 1: Collect PM rates
    items.forEach(row => {
        if (row.custom_is_packaging_material && row.item_code) {
            pm_map[row.item_code] = flt(row.basic_rate);
        }
    });

    // Step 2: Apply PM cost to rows
    items.forEach(row => {

        if (row.custom_packaging_item && pm_map[row.custom_packaging_item] != null) {

            let new_val = flt(pm_map[row.custom_packaging_item]);

            if (row.custom_per_unit_pm_cost !== new_val) {

                frappe.model.set_value(
                    row.doctype,
                    row.name,
                    'custom_per_unit_pm_cost',
                    new_val
                );

                calculate_row_values(frm, row.doctype, row.name);
            }
        }
    });
}


// =======================
// Row Level Calculation
// =======================
function calculate_row_values(frm, cdt, cdn) {

    let row = locals[cdt][cdn];

    let qty         = flt(row.qty);
    let packet_size = flt(row.custom_packet_size);
    let per_kg      = flt(row.custom_per_kg_cost_);
    let per_unit_pm = flt(row.custom_per_unit_pm_cost);

    let total_kg = qty * packet_size;
    frappe.model.set_value(cdt, cdn, 'custom_total_kg_consumed', total_kg);

    let per_packet_cost = packet_size * per_kg;
    frappe.model.set_value(cdt, cdn, 'custom_per_packet_fg_cost', per_packet_cost);

    let items = frm.doc.items || [];
    let is_source_row = items.length > 0 && row.name === items[0].name;

    if (!is_source_row) {

        if (per_unit_pm > 0) {

            let total_per_packet = per_packet_cost + per_unit_pm;

            frappe.model.set_value(cdt, cdn, 'custom_total_per_packet_fg_cost', total_per_packet);

            let final_rate = flt(row.custom_final_rate_after_loss);
            frappe.model.set_value(cdt, cdn, 'basic_rate', final_rate > 0 ? final_rate : total_per_packet);

        } else {

            frappe.model.set_value(cdt, cdn, 'custom_total_per_packet_fg_cost', 0);

            if (per_packet_cost > 0) {
                let final_rate = flt(row.custom_final_rate_after_loss);
                frappe.model.set_value(cdt, cdn, 'basic_rate', final_rate > 0 ? final_rate : per_packet_cost);
            }
        }
    }
}


// =======================
// Batch Auto Set
// =======================
function set_sfg_batch(frm) {

    (frm.doc.items || []).forEach(function(row) {

        if (row.custom_packaging_item && row.item_code) {

            let match = row.item_code.match(/(\d{4})$/);
            let last_digits = match ? match[1] : "";

            if (last_digits) {

                let today    = frappe.datetime.get_today();
                let date_obj = new Date(today);

                let month = ("0" + (date_obj.getMonth() + 1)).slice(-2);
                let year  = date_obj.getFullYear().toString().slice(-2);

                let batch_name = `RM/${month}/${year}/${last_digits}`;

                frappe.model.set_value(
                    row.doctype,
                    row.name,
                    'custom_sfg_batch',
                    batch_name
                );
            }
        }
    });
}


// =======================
// Total Calculation
// =======================
function calculate_totals(frm) {

    let fg_total    = 0;
    let sfg_total   = 0;
    let per_kg_cost = 0;

    (frm.doc.items || []).forEach(function(row) {

        if (row.custom__is_fg_item) {
            fg_total    += flt(row.custom_total_kg_consumed);
            per_kg_cost  = flt(row.custom_per_kg_cost_);
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
// Main Controller
// =======================
function calculate_all(frm) {
    calculate_fg_total(frm);
    calculate_process_loss(frm);
    calculate_distribution(frm);
}


// =======================
// Total FG Qty (Packets)
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
// Process Loss %
// =======================
function calculate_process_loss(frm) {
    let loss_qty = flt(frm.doc.custom_process_loss_quantity);
    let total_outgoing = flt(frm.doc.custom_total_outgoing_kg_sfg__);
    let result = 0;
    if (total_outgoing > 0) {
        result = (loss_qty / total_outgoing) * 100;
    }
    frm.set_value('custom_packaging_process_loss_', flt(result, 2));
}


// // =======================
// // Distribution Logic
// // =======================
// function calculate_distribution(frm) {

//     let total_packets = flt(frm.doc.custom_total_packets_produced);
//     let total_packaging_loss = flt(frm.doc.custom_packaging_loss_amount);

//     (frm.doc.items || []).forEach(row => {

//         // Non-FG rows: reset distribution fields
//         if (!row.custom__is_fg_item) {
//             frappe.model.set_value(row.doctype, row.name, {
//                 custom_distributed_process_loss: 0,
//                 custom_distributed_rate: 0,
//                 custom_final_rate_after_loss: 0
//             });
//             return;
//         }

//         // A. Distribution Ratio
//         let distribution = 0;
//         if (total_packets > 0) {
//             distribution = flt(row.qty) / total_packets;
//         }
//         frappe.model.set_value(
//             row.doctype,
//             row.name,
//             'custom_distributed_process_loss',
//             flt(distribution, 6)
//         );

//         // B. Distributed Rate
//         let distributed_rate = distribution * total_packaging_loss;
//         frappe.model.set_value(
//             row.doctype,
//             row.name,
//             'custom_distributed_rate',
//             flt(distributed_rate, 6)
//         );

//         // C. Final Rate After Loss
//         let base_rate =
//             flt(row.custom_total_per_packet_fg_cost) ||
//             flt(row.custom_per_packet_fg_cost);

//         let final_rate = base_rate + distributed_rate;
//         frappe.model.set_value(
//             row.doctype,
//             row.name,
//             'custom_final_rate_after_loss',
//             flt(final_rate, 6)
//         );
//     });
// }



// =======================
// Distribution Logic
// =======================
function calculate_distribution(frm) {

    let total_packets = flt(frm.doc.custom_total_packets_produced);
    let total_packaging_loss = flt(frm.doc.custom_packaging_loss_amount);

    (frm.doc.items || []).forEach(row => {

        // Non-FG rows: reset distribution fields
        if (!row.custom__is_fg_item) {
            frappe.model.set_value(row.doctype, row.name, {
                custom_distributed_process_loss: 0,
                custom_distributed_rate: 0,
                custom_final_rate_after_loss: 0
            });
            return;
        }

        // A. Distribution Ratio
        let distribution = 0;
        if (total_packets > 0) {
            distribution = flt(row.qty) / total_packets;
        }

        frappe.model.set_value(
            row.doctype,
            row.name,
            'custom_distributed_process_loss',
            flt(distribution)
        );

        // B. Distributed Rate
        let distributed_rate = distribution * total_packaging_loss;

        frappe.model.set_value(
            row.doctype,
            row.name,
            'custom_distributed_rate',
            flt(distributed_rate)
        );

        // C. Final Rate After Loss = BASIC RATE ONLY
        let basic_rate =
            flt(row.basic_rate) ||
            flt(row.custom_total_per_packet_fg_cost) ||
            flt(row.custom_per_packet_fg_cost);

        // ✅ FIX: force 3 decimal display (171.670)
        frappe.model.set_value(
            row.doctype,
            row.name,
            'custom_final_rate_after_loss',
            parseFloat(flt(basic_rate).toFixed(2))
        );
    });
}