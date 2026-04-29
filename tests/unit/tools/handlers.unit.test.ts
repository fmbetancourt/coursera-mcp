import { describe, it, expect, beforeEach } from 'bun:test';
import { toolHandlers } from '../../../src/index';

describe('Tool Handlers', () => {
  it('should have all 7 tool handlers defined', () => {
    expect(toolHandlers).toBeDefined();
    expect(Object.keys(toolHandlers).length).toBe(7);
  });

  it('should have search_courses handler', () => {
    expect(toolHandlers.search_courses).toBeDefined();
    expect(typeof toolHandlers.search_courses).toBe('function');
  });

  it('should have search_programs handler', () => {
    expect(toolHandlers.search_programs).toBeDefined();
    expect(typeof toolHandlers.search_programs).toBe('function');
  });

  it('should have get_course_details handler', () => {
    expect(toolHandlers.get_course_details).toBeDefined();
    expect(typeof toolHandlers.get_course_details).toBe('function');
  });

  it('should have get_program_details handler', () => {
    expect(toolHandlers.get_program_details).toBeDefined();
    expect(typeof toolHandlers.get_program_details).toBe('function');
  });

  it('should have get_enrolled_courses handler', () => {
    expect(toolHandlers.get_enrolled_courses).toBeDefined();
    expect(typeof toolHandlers.get_enrolled_courses).toBe('function');
  });

  it('should have get_progress handler', () => {
    expect(toolHandlers.get_progress).toBeDefined();
    expect(typeof toolHandlers.get_progress).toBe('function');
  });

  it('should have get_recommendations handler', () => {
    expect(toolHandlers.get_recommendations).toBeDefined();
    expect(typeof toolHandlers.get_recommendations).toBe('function');
  });

  describe('Unimplemented tools (Fase 3)', () => {
    it('should throw for get_enrolled_courses', async () => {
      try {
        await toolHandlers.get_enrolled_courses();
        expect.unreachable();
      } catch (error) {
        expect(error).toBeDefined();
        expect((error as Error).message).toContain('not yet implemented');
      }
    });

    it('should throw for get_progress', async () => {
      try {
        await toolHandlers.get_progress();
        expect.unreachable();
      } catch (error) {
        expect(error).toBeDefined();
        expect((error as Error).message).toContain('not yet implemented');
      }
    });

    it('should throw for get_recommendations', async () => {
      try {
        await toolHandlers.get_recommendations();
        expect.unreachable();
      } catch (error) {
        expect(error).toBeDefined();
        expect((error as Error).message).toContain('not yet implemented');
      }
    });
  });
});
