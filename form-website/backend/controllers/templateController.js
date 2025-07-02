import { Template } from '../models/Template.js';

export class TemplateController {
  // GET /api/templates
  static async getAllTemplates(req, res) {
    try {
      const templates = await Template.findAll();
      res.status(200).json(templates);
    } catch (error) {
      console.error('Error retrieving template:', error);
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
      
      if (error.message === 'Invalid ID') {
        return res.status(400).json({
          error: 'Invalid ID',
          details: 'The ID provided is not a valid MongoDB ObjectId'
        });
      }
      
      if (error.message === 'Template not found') {
        return res.status(404).json({
          error: 'Template non trovato',
          details: 'No templates found with this ID'
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
      
      if (error.message === 'ID non valido') {
        return res.status(400).json({
          error: 'Invalid ID',
          details: 'The ID provided is not a valid MongoDB ObjectId'
        });
      }
      
      if (error.message === 'Template not found') {
        return res.status(404).json({
          error: 'Template not found',
          details: 'No templates found with this ID'
        });
      }
      
      if (error.message === 'Another template with this name already exists') {
        return res.status(409).json({
          error: 'Name already exists',
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
      
      if (error.message === 'Invalid ID') {
        return res.status(400).json({
          error: 'Invalid ID',
          details: 'The ID provided is not a valid MongoDB ObjectId'
        });
      }
      
      if (error.message === 'Template not found') {
        return res.status(404).json({
          error: 'Template not found',
          details: 'No templates found with this ID'
        });
      }
      
      res.status(500).json({
        error: 'Internal Server Error',
        details: error.message
      });
    }
  }
}