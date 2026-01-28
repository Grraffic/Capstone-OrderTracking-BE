const supabase = require("../config/supabase");
const { sendContactNotificationToCustodians } = require("../services/contact.service");

/**
 * Contact Controller - CRUD Operations
 *
 * Endpoints:
 * - POST   /api/contact          - Create new contact
 * - GET    /api/contact          - Get all contacts
 * - GET    /api/contact/:id      - Get single contact
 * - PUT    /api/contact/:id      - Update contact
 * - DELETE /api/contact/:id      - Delete contact
 * - PUT    /api/contact/:id/read - Mark contact as read
 */

exports.createContact = async (req, res) => {
  try {
    const { name, email, message } = req.body;

    // Create contact data object - all fields are nullable per schema
    const contactData = {
      name: name?.trim() || null,
      email: email?.trim()?.toLowerCase() || null,
      message: message?.trim() || null,
      // created_at will be set by Supabase default
    };

    // Insert into Supabase
    const { data, error } = await supabase
      .from("contacts")
      .insert([contactData])
      .select()
      .single();

    if (error) {
      console.error("Supabase insert error:", error);
      return res.status(502).json({
        success: false,
        message: "Database error",
        details: error.message,
      });
    }

    // Notify all property custodians via email (fire-and-forget; do not block response)
    sendContactNotificationToCustodians(contactData).catch((err) =>
      console.error("Contact notification email error:", err)
    );

    // Return success response
    return res.status(201).json({
      success: true,
      message: "Contact message sent successfully",
      data: data,
    });
  } catch (err) {
    console.error("Contact creation error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      details: err.message,
    });
  }
};

exports.getContacts = async (req, res) => {
  try {
    // For now return all contacts ordered by created_at desc
    const { data, error } = await supabase
      .from("contacts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase select error:", error);
      return res
        .status(502)
        .json({ message: "Database error", details: error.message });
    }

    return res.json(data);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Get a single contact by ID
exports.getContactById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id)
      return res.status(400).json({
        success: false,
        message: "Missing id parameter",
      });

    const { data, error } = await supabase
      .from("contacts")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Supabase select error:", error);
      return res.status(502).json({
        success: false,
        message: "Database error",
        details: error.message,
      });
    }

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Contact not found",
      });
    }

    return res.json({
      success: true,
      data,
    });
  } catch (err) {
    console.error("Get contact error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      details: err.message,
    });
  }
};

// Update a contact
exports.updateContact = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, message } = req.body;

    if (!id)
      return res.status(400).json({
        success: false,
        message: "Missing id parameter",
      });

    const { data, error } = await supabase
      .from("contacts")
      .update({
        name: name?.trim() || null,
        email: email?.trim()?.toLowerCase() || null,
        message: message?.trim() || null,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Supabase update error:", error);
      return res.status(502).json({
        success: false,
        message: "Database error",
        details: error.message,
      });
    }

    return res.json({
      success: true,
      message: "Contact updated successfully",
      data,
    });
  } catch (err) {
    console.error("Update contact error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      details: err.message,
    });
  }
};

// Delete a contact
exports.deleteContact = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id)
      return res.status(400).json({
        success: false,
        message: "Missing id parameter",
      });

    const { error } = await supabase.from("contacts").delete().eq("id", id);

    if (error) {
      console.error("Supabase delete error:", error);
      return res.status(502).json({
        success: false,
        message: "Database error",
        details: error.message,
      });
    }

    return res.json({
      success: true,
      message: "Contact deleted successfully",
    });
  } catch (err) {
    console.error("Delete contact error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      details: err.message,
    });
  }
};

// Remove markAsRead since we don't have a read column anymore
