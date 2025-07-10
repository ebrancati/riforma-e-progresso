import { Template } from '../models/Template.js';

export class TemplateController {
  // GET /api/templates
  static async getAllTemplates(req, res) {
    try {
      const templates = await Template.findAll();
      res.status(200).json(templates);
    } catch (error) {
      console.error('Error retrieving templates:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        details: error.message
      });
    }
  }

  // GET /api/templates/:id
  static async getTemplateById(req, res) {
    try {
      const { id } = req.params;
      const template = await Template.findById(id);
      res.status(200).json(template);
    } catch (error) {
      console.error('Error retrieving template:', error);
      
      // Handle custom ID validation errors
      if (error.message === 'Invalid ID format') {
        return res.status(400).json({
          error: 'Invalid ID Format',
          details: 'The ID provided is not in the correct format (PREFIX_TIMESTAMP_RANDOM)'
        });
      }
      
      if (error.message === 'Invalid template ID') {
        return res.status(400).json({
          error: 'Invalid Template ID',
          details: 'The ID provided is not a valid template ID (must start with TPL_)'
        });
      }
      
      if (error.message === 'Template not found') {
        return res.status(404).json({
          error: 'Template not found',
          details: 'No template found with this ID'
        });
      }
      
      res.status(500).json({
        error: 'Internal Server Error',
        details: error.message
      });
    }
  }

  // POST /api/templates
  static async createTemplate(req, res) {
    try {
      const template = new Template(req.body);
      const savedTemplate = await template.save();
      
      res.status(201).json({
        message: 'Template created successfully',
        template: savedTemplate
      });
    } catch (error) {
      console.error('Error creating template:', error);
      
      if (error.message === 'A template with this name already exists') {
        return res.status(409).json({
          error: 'Template already exists',
          details: error.message
        });
      }
      
      // Handle validation errors from InputSanitizer
      if (error.message.includes('sanitization') || 
          error.message.includes('required') ||
          error.message.includes('Invalid')) {
        return res.status(400).json({
          error: 'Validation Error',
          details: error.message
        });
      }
      
      res.status(500).json({
        error: 'Internal Server Error',
        details: error.message
      });
    }
  }

  // PUT /api/templates/:id
  static async updateTemplate(req, res) {
    try {
      const { id } = req.params;
      const updatedTemplate = await Template.updateById(id, req.body);
      
      res.status(200).json({
        message: 'Template updated successfully',
        template: updatedTemplate
      });
    } catch (error) {
      console.error('Error updating template:', error);
      
      // Handle ID validation errors
      if (error.message === 'Invalid ID format') {
        return res.status(400).json({
          error: 'Invalid ID Format',
          details: 'The ID provided is not in the correct format (PREFIX_TIMESTAMP_RANDOM)'
        });
      }
      
      if (error.message === 'Invalid template ID') {
        return res.status(400).json({
          error: 'Invalid Template ID',
          details: 'The ID provided is not a valid template ID (must start with TPL_)'
        });
      }
      
      if (error.message === 'Template not found') {
        return res.status(404).json({
          error: 'Template not found',
          details: 'No template found with this ID'
        });
      }
      
      if (error.message === 'Another template with this name already exists') {
        return res.status(409).json({
          error: 'Name already exists',
          details: error.message
        });
      }
      
      // Handle validation errors
      if (error.message.includes('sanitization') || 
          error.message.includes('Invalid')) {
        return res.status(400).json({
          error: 'Validation Error',
          details: error.message
        });
      }
      
      res.status(500).json({
        error: 'Internal Server Error',
        details: error.message
      });
    }
  }

  // DELETE /api/templates/:id
  static async deleteTemplate(req, res) {
    try {
      const { id } = req.params;
      const result = await Template.deleteById(id);
      
      res.status(200).json({
        message: 'Template successfully deleted',
        deletedId: result.deletedId
      });
    } catch (error) {
      console.error('Error deleting template:', error);
      
      // Handle ID validation errors
      if (error.message === 'Invalid ID format') {
        return res.status(400).json({
          error: 'Invalid ID Format',
          details: 'The ID provided is not in the correct format (PREFIX_TIMESTAMP_RANDOM)'
        });
      }
      
      if (error.message === 'Invalid template ID') {
        return res.status(400).json({
          error: 'Invalid Template ID',
          details: 'The ID provided is not a valid template ID (must start with TPL_)'
        });
      }
      
      if (error.message === 'Template not found') {
        return res.status(404).json({
          error: 'Template not found',
          details: 'No template found with this ID'
        });
      }
      
      res.status(500).json({
        error: 'Internal Server Error',
        details: error.message
      });
    }
  }
}