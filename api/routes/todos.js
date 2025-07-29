const express = require('express');
const { getDatabase } = require('../config/database');
const { logDatabaseChange, logger } = require('../utils/logger');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get todos
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { 
      status, 
      priority, 
      page = 1, 
      limit = 20
    } = req.query;

    const db = getDatabase();
    let whereClause = 'WHERE user_id = ?';
    const queryParams = [req.user.id];

    if (status) {
      whereClause += ' AND status = ?';
      queryParams.push(status);
    }

    if (priority) {
      whereClause += ' AND priority = ?';
      queryParams.push(priority);
    }

    const offset = (page - 1) * limit;
    queryParams.push(parseInt(limit), offset);

    const [todos] = await db.execute(`
      SELECT * FROM todos 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `, queryParams);

    // Get total count
    const [countResult] = await db.execute(`
      SELECT COUNT(*) as total FROM todos ${whereClause}
    `, queryParams.slice(0, -2));

    res.json({
      todos,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult[0].total,
        pages: Math.ceil(countResult[0].total / limit)
      }
    });

  } catch (error) {
    logger.error('Error fetching todos:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create todo
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { title, description, priority = 'medium', due_date } = req.body;
    const db = getDatabase();

    if (!title || title.trim().length === 0) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const validPriorities = ['low', 'medium', 'high'];
    if (!validPriorities.includes(priority)) {
      return res.status(400).json({ error: 'Invalid priority' });
    }

    const [result] = await db.execute(`
      INSERT INTO todos (user_id, title, description, priority, due_date, status)
      VALUES (?, ?, ?, ?, ?, 'pending')
    `, [req.user.id, title.trim(), description || null, priority, due_date || null]);

    // Log database change
    await logDatabaseChange('INSERT', 'todos', {
      id: result.insertId,
      title: title.trim(),
      priority,
      user_id: req.user.id,
      status: 'pending'
    }, req.user.id);

    res.status(201).json({
      message: 'Todo created successfully',
      todoId: result.insertId
    });

  } catch (error) {
    logger.error('Error creating todo:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update todo
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, status, priority, due_date } = req.body;
    const db = getDatabase();

    // Check if todo exists
    const [existing] = await db.execute(
      'SELECT * FROM todos WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Todo not found' });
    }

    const currentTodo = existing[0];
    const updates = [];
    const values = [];

    if (title !== undefined) {
      if (!title || title.trim().length === 0) {
        return res.status(400).json({ error: 'Title cannot be empty' });
      }
      updates.push('title = ?');
      values.push(title.trim());
    }

    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description || null);
    }

    if (status !== undefined) {
      const validStatuses = ['pending', 'in_progress', 'completed', 'archived'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }
      updates.push('status = ?');
      values.push(status);
      
      // Set completed_at when marking as completed
      if (status === 'completed' && currentTodo.status !== 'completed') {
        updates.push('completed_at = NOW()');
      } else if (status !== 'completed') {
        updates.push('completed_at = NULL');
      }
    }

    if (priority !== undefined) {
      const validPriorities = ['low', 'medium', 'high'];
      if (!validPriorities.includes(priority)) {
        return res.status(400).json({ error: 'Invalid priority' });
      }
      updates.push('priority = ?');
      values.push(priority);
    }

    if (due_date !== undefined) {
      updates.push('due_date = ?');
      values.push(due_date || null);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    values.push(id, req.user.id);

    await db.execute(`
      UPDATE todos 
      SET ${updates.join(', ')}, updated_at = NOW()
      WHERE id = ? AND user_id = ?
    `, values);

    // Log database change
    await logDatabaseChange('UPDATE', 'todos', {
      id: parseInt(id),
      status,
      priority,
      title
    }, req.user.id);

    res.json({ message: 'Todo updated successfully' });

  } catch (error) {
    logger.error('Error updating todo:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete todo
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    const [result] = await db.execute(
      'DELETE FROM todos WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Todo not found' });
    }

    // Log database change
    await logDatabaseChange('DELETE', 'todos', {
      id: parseInt(id)
    }, req.user.id);

    res.json({ message: 'Todo deleted successfully' });

  } catch (error) {
    logger.error('Error deleting todo:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
