import { pool } from '../pool';
import { v4 as uuidv4 } from 'uuid';

describe('Database Constraints Property Tests', () => {
  let testOrgId: string;
  let testEmployeeId: string;

  beforeAll(async () => {
    // Create a test organization
    const orgResult = await pool.query(
      `INSERT INTO organizations (name, email, password_hash) 
       VALUES ($1, $2, $3) RETURNING id`,
      ['Test Org', `test-${Date.now()}@example.com`, 'hashed_password']
    );
    testOrgId = orgResult.rows[0].id;

    // Create a test employee
    const empResult = await pool.query(
      `INSERT INTO employees (organization_id, name, email, role, department) 
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [testOrgId, 'Test Employee', `emp-${Date.now()}@example.com`, 'Developer', 'Engineering']
    );
    testEmployeeId = empResult.rows[0].id;
  });

  afterAll(async () => {
    // Clean up test data
    await pool.query('DELETE FROM organizations WHERE id = $1', [testOrgId]);
  });

  describe('Property: Data integrity enforcement', () => {
    test('should enforce unique email constraint for organizations', async () => {
      const email = `unique-${Date.now()}@example.com`;
      
      // First insert should succeed
      await pool.query(
        'INSERT INTO organizations (name, email, password_hash) VALUES ($1, $2, $3)',
        ['Org 1', email, 'hash1']
      );

      // Second insert with same email should fail
      await expect(
        pool.query(
          'INSERT INTO organizations (name, email, password_hash) VALUES ($1, $2, $3)',
          ['Org 2', email, 'hash2']
        )
      ).rejects.toThrow();

      // Cleanup
      await pool.query('DELETE FROM organizations WHERE email = $1', [email]);
    });

    test('should enforce unique employee email within organization', async () => {
      const email = `emp-unique-${Date.now()}@example.com`;
      
      // First insert should succeed
      await pool.query(
        `INSERT INTO employees (organization_id, name, email, role, department) 
         VALUES ($1, $2, $3, $4, $5)`,
        [testOrgId, 'Employee 1', email, 'Developer', 'Engineering']
      );

      // Second insert with same email in same org should fail
      await expect(
        pool.query(
          `INSERT INTO employees (organization_id, name, email, role, department) 
           VALUES ($1, $2, $3, $4, $5)`,
          [testOrgId, 'Employee 2', email, 'Developer', 'Engineering']
        )
      ).rejects.toThrow();

      // Cleanup
      await pool.query('DELETE FROM employees WHERE email = $1', [email]);
    });

    test('should enforce cascade delete from organizations to employees', async () => {
      // Create a temporary organization
      const orgResult = await pool.query(
        `INSERT INTO organizations (name, email, password_hash) 
         VALUES ($1, $2, $3) RETURNING id`,
        ['Temp Org', `temp-${Date.now()}@example.com`, 'hash']
      );
      const tempOrgId = orgResult.rows[0].id;

      // Create employees for this organization
      await pool.query(
        `INSERT INTO employees (organization_id, name, email, role, department) 
         VALUES ($1, $2, $3, $4, $5)`,
        [tempOrgId, 'Temp Employee', `temp-emp-${Date.now()}@example.com`, 'Developer', 'Engineering']
      );

      // Verify employee exists
      const beforeDelete = await pool.query(
        'SELECT COUNT(*) FROM employees WHERE organization_id = $1',
        [tempOrgId]
      );
      expect(parseInt(beforeDelete.rows[0].count)).toBeGreaterThan(0);

      // Delete organization
      await pool.query('DELETE FROM organizations WHERE id = $1', [tempOrgId]);

      // Verify employees are also deleted (cascade)
      const afterDelete = await pool.query(
        'SELECT COUNT(*) FROM employees WHERE organization_id = $1',
        [tempOrgId]
      );
      expect(parseInt(afterDelete.rows[0].count)).toBe(0);
    });

    test('should enforce valid task status values', async () => {
      // Valid status should succeed
      const validResult = await pool.query(
        `INSERT INTO tasks (organization_id, title, assigned_to, status, complexity) 
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [testOrgId, 'Test Task', testEmployeeId, 'assigned', 'medium']
      );
      expect(validResult.rows[0].id).toBeDefined();

      // Invalid status should fail
      await expect(
        pool.query(
          `INSERT INTO tasks (organization_id, title, assigned_to, status, complexity) 
           VALUES ($1, $2, $3, $4, $5)`,
          [testOrgId, 'Test Task 2', testEmployeeId, 'invalid_status', 'medium']
        )
      ).rejects.toThrow();

      // Cleanup
      await pool.query('DELETE FROM tasks WHERE id = $1', [validResult.rows[0].id]);
    });

    test('should enforce productivity score range (0-100)', async () => {
      // Valid score should succeed
      const validResult = await pool.query(
        `INSERT INTO productivity_scores (organization_id, employee_id, score) 
         VALUES ($1, $2, $3) RETURNING id`,
        [testOrgId, testEmployeeId, 75.5]
      );
      expect(validResult.rows[0].id).toBeDefined();

      // Score > 100 should fail
      await expect(
        pool.query(
          `INSERT INTO productivity_scores (organization_id, employee_id, score) 
           VALUES ($1, $2, $3)`,
          [testOrgId, testEmployeeId, 150]
        )
      ).rejects.toThrow();

      // Score < 0 should fail
      await expect(
        pool.query(
          `INSERT INTO productivity_scores (organization_id, employee_id, score) 
           VALUES ($1, $2, $3)`,
          [testOrgId, testEmployeeId, -10]
        )
      ).rejects.toThrow();

      // Cleanup
      await pool.query('DELETE FROM productivity_scores WHERE id = $1', [validResult.rows[0].id]);
    });

    test('should enforce foreign key constraints', async () => {
      const nonExistentId = uuidv4();

      // Task with non-existent employee should fail
      await expect(
        pool.query(
          `INSERT INTO tasks (organization_id, title, assigned_to, status, complexity) 
           VALUES ($1, $2, $3, $4, $5)`,
          [testOrgId, 'Test Task', nonExistentId, 'assigned', 'medium']
        )
      ).rejects.toThrow();

      // Employee with non-existent organization should fail
      await expect(
        pool.query(
          `INSERT INTO employees (organization_id, name, email, role, department) 
           VALUES ($1, $2, $3, $4, $5)`,
          [nonExistentId, 'Test', 'test@example.com', 'Developer', 'Engineering']
        )
      ).rejects.toThrow();
    });
  });
});
