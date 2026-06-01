/**
 * Quotation Workflow Validation Tests
 * 
 * Comprehensive test suite for quotation status transition rules.
 * Ensures the state machine enforces business rules:
 * - Only valid transitions are allowed
 * - Terminal states cannot be reversed
 * - Approved quotations cannot be rejected
 * - Clear error messages for invalid transitions
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { prisma } from '@/config/database';
import { QuotationService } from './quotation.service';
import { BadRequestError, NotFoundError } from '@/common/errors/api.error';
import { QuotationStatus, QuotationActivityType } from '@prisma/client';
import NotificationService from '@/modules/notification/notification.service';

// Mock NotificationService
vi.mock('@/modules/notification/notification.service');

// Mock Prisma
vi.mock('@/config/database', () => ({
    prisma: {
        quotation: {
            findUnique: vi.fn(),
            update: vi.fn(),
        },
        quotationActivity: {
            create: vi.fn(),
        },
    },
}));

describe('QuotationService - Workflow Status Transitions', () => {
    const mockUserId = 'user-123';
    const quotationService = new QuotationService();

    beforeEach(() => {
        vi.clearAllMocks();
        (NotificationService.notify as any).mockResolvedValue(undefined);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    // ────────────────────────────────────────────────────────────────────────
    // APPROVE QUOTATION TESTS
    // ────────────────────────────────────────────────────────────────────────

    describe('approveQuotation()', () => {
        const mockQuotation = {
            id: 'q-001',
            status: QuotationStatus.SENT,
            quotationNumber: 'QT-2024-001',
            customerName: 'ACME Corp',
            customerEmail: 'acme@example.com',
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        describe('Valid State Transitions', () => {
            [
                QuotationStatus.PENDING,
                QuotationStatus.DRAFT,
                QuotationStatus.SENT,
                QuotationStatus.VIEWED,
                QuotationStatus.REPLIED,
            ].forEach((fromStatus) => {
                it(`should allow transition from ${fromStatus} → APPROVED`, async () => {
                    const quotation = { ...mockQuotation, status: fromStatus };
                    (prisma.quotation.findUnique as any).mockResolvedValueOnce(quotation);
                    (prisma.quotation.update as any).mockResolvedValueOnce({
                        ...quotation,
                        status: QuotationStatus.APPROVED,
                    });
                    (prisma.quotationActivity.create as any).mockResolvedValueOnce({});

                    const result = await quotationService.approveQuotation(
                        quotation.id,
                        mockUserId
                    );

                    expect(result.status).toBe(QuotationStatus.APPROVED);
                    expect(prisma.quotation.update).toHaveBeenCalledWith({
                        where: { id: quotation.id },
                        data: { status: QuotationStatus.APPROVED },
                    });
                    expect(prisma.quotationActivity.create).toHaveBeenCalled();
                    expect(NotificationService.notify).toHaveBeenCalled();
                });
            });
        });

        describe('Invalid State Transitions', () => {
            [
                {
                    status: QuotationStatus.APPROVED,
                    reason: 'already approved',
                },
                {
                    status: QuotationStatus.REJECTED,
                    reason: 'already rejected',
                },
                {
                    status: QuotationStatus.CONVERTED,
                    reason: 'already converted to order',
                },
                {
                    status: QuotationStatus.EXPIRED,
                    reason: 'already expired',
                },
            ].forEach(({ status, reason }) => {
                it(`should reject transition from ${status} → APPROVED (${reason})`, async () => {
                    const quotation = { ...mockQuotation, status };
                    (prisma.quotation.findUnique as any).mockResolvedValueOnce(
                        quotation
                    );

                    await expect(
                        quotationService.approveQuotation(quotation.id, mockUserId)
                    ).rejects.toThrow(BadRequestError);

                    expect(prisma.quotation.update).not.toHaveBeenCalled();
                });
            });
        });

        it('should throw NotFoundError if quotation does not exist', async () => {
            (prisma.quotation.findUnique as any).mockResolvedValueOnce(null);

            await expect(
                quotationService.approveQuotation('nonexistent-id', mockUserId)
            ).rejects.toThrow(NotFoundError);

            expect(prisma.quotation.update).not.toHaveBeenCalled();
        });

        it('should create activity log entry when approving', async () => {
            const quotation = { ...mockQuotation, status: QuotationStatus.SENT };
            (prisma.quotation.findUnique as any).mockResolvedValueOnce(quotation);
            (prisma.quotation.update as any).mockResolvedValueOnce({
                ...quotation,
                status: QuotationStatus.APPROVED,
            });
            (prisma.quotationActivity.create as any).mockResolvedValueOnce({});

            await quotationService.approveQuotation(quotation.id, mockUserId);

            expect(prisma.quotationActivity.create).toHaveBeenCalledWith({
                data: {
                    quotationId: quotation.id,
                    action: QuotationActivityType.APPROVED,
                    performedBy: mockUserId,
                },
            });
        });

        it('should send notification when approving', async () => {
            const quotation = { ...mockQuotation, status: QuotationStatus.SENT };
            (prisma.quotation.findUnique as any).mockResolvedValueOnce(quotation);
            (prisma.quotation.update as any).mockResolvedValueOnce({
                ...quotation,
                status: QuotationStatus.APPROVED,
            });
            (prisma.quotationActivity.create as any).mockResolvedValueOnce({});

            await quotationService.approveQuotation(quotation.id, mockUserId);

            expect(NotificationService.notify).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: expect.any(String),
                    title: 'Quotation Approved',
                    relatedId: quotation.id,
                    triggeredById: mockUserId,
                })
            );
        });
    });

    // ────────────────────────────────────────────────────────────────────────
    // REJECT QUOTATION TESTS
    // ────────────────────────────────────────────────────────────────────────

    describe('rejectQuotation()', () => {
        const mockQuotation = {
            id: 'q-002',
            status: QuotationStatus.SENT,
            quotationNumber: 'QT-2024-002',
            customerName: 'ACME Corp',
            customerEmail: 'acme@example.com',
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        describe('Valid State Transitions', () => {
            [
                QuotationStatus.PENDING,
                QuotationStatus.DRAFT,
                QuotationStatus.SENT,
                QuotationStatus.VIEWED,
                QuotationStatus.REPLIED,
            ].forEach((fromStatus) => {
                it(`should allow transition from ${fromStatus} → REJECTED`, async () => {
                    const quotation = { ...mockQuotation, status: fromStatus };
                    (prisma.quotation.findUnique as any).mockResolvedValueOnce(
                        quotation
                    );
                    (prisma.quotation.update as any).mockResolvedValueOnce({
                        ...quotation,
                        status: QuotationStatus.REJECTED,
                    });
                    (prisma.quotationActivity.create as any).mockResolvedValueOnce(
                        {}
                    );

                    const result = await quotationService.rejectQuotation(
                        quotation.id,
                        'Not competitive',
                        mockUserId
                    );

                    expect(result.status).toBe(QuotationStatus.REJECTED);
                    expect(prisma.quotation.update).toHaveBeenCalledWith({
                        where: { id: quotation.id },
                        data: { status: QuotationStatus.REJECTED },
                    });
                    expect(prisma.quotationActivity.create).toHaveBeenCalled();
                });
            });
        });

        describe('CRITICAL: Approved Quotation Cannot Be Rejected', () => {
            it('should reject APPROVED → REJECTED transition', async () => {
                const quotation = {
                    ...mockQuotation,
                    status: QuotationStatus.APPROVED,
                };
                (prisma.quotation.findUnique as any).mockResolvedValueOnce(
                    quotation
                );

                await expect(
                    quotationService.rejectQuotation(
                        quotation.id,
                        'Change of mind',
                        mockUserId
                    )
                ).rejects.toThrow(
                    'Approved quotation cannot be rejected. Approved quotations are final and can only be converted to orders.'
                );

                expect(prisma.quotation.update).not.toHaveBeenCalled();
            });

            it('should provide clear error message for APPROVED rejection attempt', async () => {
                const quotation = {
                    ...mockQuotation,
                    status: QuotationStatus.APPROVED,
                };
                (prisma.quotation.findUnique as any).mockResolvedValueOnce(
                    quotation
                );

                try {
                    await quotationService.rejectQuotation(
                        quotation.id,
                        'Bad reason',
                        mockUserId
                    );
                    throw new Error('Should have thrown');
                } catch (err: any) {
                    expect(err.message).toContain('Approved quotation cannot be rejected');
                    expect(err.message).toContain('converted to orders');
                }
            });
        });

        describe('Invalid State Transitions (Non-Approved)', () => {
            [
                {
                    status: QuotationStatus.REJECTED,
                    reason: 'already rejected',
                },
                {
                    status: QuotationStatus.CONVERTED,
                    reason: 'already converted to order',
                },
                {
                    status: QuotationStatus.EXPIRED,
                    reason: 'already expired',
                },
            ].forEach(({ status, reason }) => {
                it(`should reject transition from ${status} → REJECTED (${reason})`, async () => {
                    const quotation = { ...mockQuotation, status };
                    (prisma.quotation.findUnique as any).mockResolvedValueOnce(
                        quotation
                    );

                    await expect(
                        quotationService.rejectQuotation(
                            quotation.id,
                            'Generic reason',
                            mockUserId
                        )
                    ).rejects.toThrow(BadRequestError);

                    expect(prisma.quotation.update).not.toHaveBeenCalled();
                });
            });
        });

        it('should throw NotFoundError if quotation does not exist', async () => {
            (prisma.quotation.findUnique as any).mockResolvedValueOnce(null);

            await expect(
                quotationService.rejectQuotation(
                    'nonexistent-id',
                    'Reason',
                    mockUserId
                )
            ).rejects.toThrow(NotFoundError);

            expect(prisma.quotation.update).not.toHaveBeenCalled();
        });

        it('should create activity log entry with rejection reason', async () => {
            const quotation = { ...mockQuotation, status: QuotationStatus.SENT };
            const reason = 'Price too high';
            (prisma.quotation.findUnique as any).mockResolvedValueOnce(quotation);
            (prisma.quotation.update as any).mockResolvedValueOnce({
                ...quotation,
                status: QuotationStatus.REJECTED,
            });
            (prisma.quotationActivity.create as any).mockResolvedValueOnce({});

            await quotationService.rejectQuotation(quotation.id, reason, mockUserId);

            expect(prisma.quotationActivity.create).toHaveBeenCalledWith({
                data: {
                    quotationId: quotation.id,
                    action: QuotationActivityType.REJECTED,
                    performedBy: mockUserId,
                    note: reason,
                },
            });
        });

        it('should create activity log entry with default note if no reason provided', async () => {
            const quotation = { ...mockQuotation, status: QuotationStatus.SENT };
            (prisma.quotation.findUnique as any).mockResolvedValueOnce(quotation);
            (prisma.quotation.update as any).mockResolvedValueOnce({
                ...quotation,
                status: QuotationStatus.REJECTED,
            });
            (prisma.quotationActivity.create as any).mockResolvedValueOnce({});

            await quotationService.rejectQuotation(
                quotation.id,
                '',
                mockUserId
            );

            expect(prisma.quotationActivity.create).toHaveBeenCalledWith({
                data: {
                    quotationId: quotation.id,
                    action: QuotationActivityType.REJECTED,
                    performedBy: mockUserId,
                    note: 'Rejected by Super Admin',
                },
            });
        });
    });

    // ────────────────────────────────────────────────────────────────────────
    // WORKFLOW STATE MACHINE TESTS
    // ────────────────────────────────────────────────────────────────────────

    describe('Quotation Workflow State Machine', () => {
        const mockQuotation = {
            id: 'q-workflow',
            quotationNumber: 'QT-WORKFLOW-001',
            customerName: 'Test Customer',
            customerEmail: 'test@example.com',
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        it('should allow happy path: DRAFT → SENT → VIEWED → APPROVED', async () => {
            const states: QuotationStatus[] = [
                QuotationStatus.DRAFT,
                QuotationStatus.SENT,
                QuotationStatus.VIEWED,
            ];

            for (const state of states) {
                const quotation = { ...mockQuotation, status: state };
                (prisma.quotation.findUnique as any).mockResolvedValueOnce(
                    quotation
                );
                (prisma.quotation.update as any).mockResolvedValueOnce({
                    ...quotation,
                    status: QuotationStatus.APPROVED,
                });
                (prisma.quotationActivity.create as any).mockResolvedValueOnce(
                    {}
                );

                const result = await quotationService.approveQuotation(
                    quotation.id,
                    mockUserId
                );

                expect(result.status).toBe(QuotationStatus.APPROVED);
            }
        });

        it('should allow rejection at early stages before approval', async () => {
            const states: QuotationStatus[] = [
                QuotationStatus.DRAFT,
                QuotationStatus.SENT,
                QuotationStatus.VIEWED,
                QuotationStatus.REPLIED,
            ];

            for (const state of states) {
                const quotation = { ...mockQuotation, status: state, id: `q-${state}` };
                (prisma.quotation.findUnique as any).mockResolvedValueOnce(
                    quotation
                );
                (prisma.quotation.update as any).mockResolvedValueOnce({
                    ...quotation,
                    status: QuotationStatus.REJECTED,
                });
                (prisma.quotationActivity.create as any).mockResolvedValueOnce(
                    {}
                );

                const result = await quotationService.rejectQuotation(
                    quotation.id,
                    'Rejected at early stage',
                    mockUserId
                );

                expect(result.status).toBe(QuotationStatus.REJECTED);
            }
        });

        it('should enforce immutability after approval', async () => {
            const quotation = { ...mockQuotation, status: QuotationStatus.APPROVED };

            // Test rejection rejection
            (prisma.quotation.findUnique as any).mockResolvedValueOnce(quotation);
            await expect(
                quotationService.rejectQuotation(quotation.id, 'Too late', mockUserId)
            ).rejects.toThrow('Approved quotation cannot be rejected');

            // Test re-approval (should fail - already approved)
            (prisma.quotation.findUnique as any).mockResolvedValueOnce(quotation);
            await expect(
                quotationService.approveQuotation(quotation.id, mockUserId)
            ).rejects.toThrow(BadRequestError);
        });

        it('should document all state transitions with activities', async () => {
            const quotation = { ...mockQuotation, status: QuotationStatus.SENT };
            (prisma.quotation.findUnique as any).mockResolvedValueOnce(quotation);
            (prisma.quotation.update as any).mockResolvedValueOnce({
                ...quotation,
                status: QuotationStatus.APPROVED,
            });
            (prisma.quotationActivity.create as any).mockResolvedValueOnce({});

            await quotationService.approveQuotation(quotation.id, mockUserId);

            expect(prisma.quotationActivity.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        quotationId: quotation.id,
                        action: expect.any(String),
                        performedBy: mockUserId,
                    }),
                })
            );
        });
    });

    // ────────────────────────────────────────────────────────────────────────
    // EDGE CASE TESTS
    // ────────────────────────────────────────────────────────────────────────

    describe('Edge Cases and Error Handling', () => {
        it('should handle concurrent approval attempts gracefully', async () => {
            const quotation = {
                id: 'q-concurrent',
                status: QuotationStatus.SENT,
                quotationNumber: 'QT-CONCURRENT',
                customerName: 'Test',
                customerEmail: 'test@example.com',
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            // First approval succeeds
            (prisma.quotation.findUnique as any)
                .mockResolvedValueOnce(quotation)
                .mockResolvedValueOnce({ ...quotation, status: QuotationStatus.APPROVED });

            (prisma.quotation.update as any)
                .mockResolvedValueOnce({ ...quotation, status: QuotationStatus.APPROVED })
                .mockResolvedValueOnce({ ...quotation, status: QuotationStatus.APPROVED });

            (prisma.quotationActivity.create as any)
                .mockResolvedValueOnce({})
                .mockResolvedValueOnce({});

            await quotationService.approveQuotation(quotation.id, mockUserId);

            // Second approval should fail (already approved)
            (prisma.quotation.findUnique as any).mockResolvedValueOnce({
                ...quotation,
                status: QuotationStatus.APPROVED,
            });

            await expect(
                quotationService.approveQuotation(quotation.id, mockUserId)
            ).rejects.toThrow(BadRequestError);
        });

        it('should preserve rejection reason in activity log', async () => {
            const quotation = {
                id: 'q-reject-reason',
                status: QuotationStatus.SENT,
                quotationNumber: 'QT-REASON',
                customerName: 'Test',
                customerEmail: 'test@example.com',
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            const reason = 'Budget constraints - project cancelled';

            (prisma.quotation.findUnique as any).mockResolvedValueOnce(quotation);
            (prisma.quotation.update as any).mockResolvedValueOnce({
                ...quotation,
                status: QuotationStatus.REJECTED,
            });
            (prisma.quotationActivity.create as any).mockResolvedValueOnce({});

            await quotationService.rejectQuotation(quotation.id, reason, mockUserId);

            expect(prisma.quotationActivity.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    note: reason,
                }),
            });
        });

        it('should validate userId format in activities', async () => {
            const quotation = {
                id: 'q-userid-validation',
                status: QuotationStatus.SENT,
                quotationNumber: 'QT-USER',
                customerName: 'Test',
                customerEmail: 'test@example.com',
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            (prisma.quotation.findUnique as any).mockResolvedValueOnce(quotation);
            (prisma.quotation.update as any).mockResolvedValueOnce({
                ...quotation,
                status: QuotationStatus.APPROVED,
            });
            (prisma.quotationActivity.create as any).mockResolvedValueOnce({});

            await quotationService.approveQuotation(
                quotation.id,
                'super-admin-123'
            );

            expect(prisma.quotationActivity.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    performedBy: 'super-admin-123',
                }),
            });
        });
    });

    // ────────────────────────────────────────────────────────────────────────
    // SEND QUOTATION - DUPLICATE PREVENTION TESTS
    // ────────────────────────────────────────────────────────────────────────

    describe('sendQuotation() - Duplicate Send Prevention', () => {
        const mockQuotation = {
            id: 'q-send-001',
            status: QuotationStatus.DRAFT,
            quotationNumber: 'QT-SEND-001',
            customerName: 'ACME Corp',
            customerEmail: 'acme@example.com',
            createdAt: new Date(),
            updatedAt: new Date(),
            items: [],
        };

        describe('Valid Initial Sends (DRAFT/PENDING)', () => {
            it('should allow sending from DRAFT status', async () => {
                const quotation = { ...mockQuotation, status: QuotationStatus.DRAFT };
                (prisma.quotation.findUnique as any).mockResolvedValueOnce(quotation);
                (prisma.quotation.update as any).mockResolvedValueOnce({
                    ...quotation,
                    status: QuotationStatus.SENT,
                });
                (prisma.quotationActivity.create as any).mockResolvedValueOnce({});

                const result = await quotationService.sendQuotation(quotation.id, mockUserId);

                expect(result.status).toBe(QuotationStatus.SENT);
                expect(prisma.quotation.update).toHaveBeenCalledWith({
                    where: { id: quotation.id },
                    data: expect.objectContaining({
                        status: QuotationStatus.SENT,
                    }),
                });
            });

            it('should allow sending from PENDING status', async () => {
                const quotation = { ...mockQuotation, status: QuotationStatus.PENDING };
                (prisma.quotation.findUnique as any).mockResolvedValueOnce(quotation);
                (prisma.quotation.update as any).mockResolvedValueOnce({
                    ...quotation,
                    status: QuotationStatus.SENT,
                });
                (prisma.quotationActivity.create as any).mockResolvedValueOnce({});

                const result = await quotationService.sendQuotation(quotation.id, mockUserId);

                expect(result.status).toBe(QuotationStatus.SENT);
            });

            it('should send with reply from DRAFT (DRAFT → REPLIED)', async () => {
                const quotation = { ...mockQuotation, status: QuotationStatus.DRAFT };
                (prisma.quotation.findUnique as any).mockResolvedValueOnce(quotation);
                (prisma.quotation.update as any).mockResolvedValueOnce({
                    ...quotation,
                    status: QuotationStatus.REPLIED,
                    adminReply: 'Here is my response',
                });
                (prisma.quotationActivity.create as any).mockResolvedValueOnce({});

                const result = await quotationService.sendQuotation(
                    quotation.id,
                    mockUserId,
                    'Here is my response'
                );

                expect(result.status).toBe(QuotationStatus.REPLIED);
            });
        });

        describe('CRITICAL: Duplicate Send Prevention', () => {
            it('should BLOCK duplicate send from SENT status without reply', async () => {
                const quotation = { ...mockQuotation, status: QuotationStatus.SENT };
                (prisma.quotation.findUnique as any).mockResolvedValueOnce(quotation);

                await expect(
                    quotationService.sendQuotation(quotation.id, mockUserId)
                ).rejects.toThrow(BadRequestError);

                expect(prisma.quotation.update).not.toHaveBeenCalled();
            });

            it('should return specific error message for duplicate send', async () => {
                const quotation = { ...mockQuotation, status: QuotationStatus.SENT };
                (prisma.quotation.findUnique as any).mockResolvedValueOnce(quotation);

                try {
                    await quotationService.sendQuotation(quotation.id, mockUserId);
                    throw new Error('Should have thrown');
                } catch (err: any) {
                    expect(err.message).toContain('already been sent');
                    expect(err.message).toContain('provide an admin reply');
                }
            });

            it('should BLOCK duplicate send from VIEWED status without reply', async () => {
                const quotation = { ...mockQuotation, status: QuotationStatus.VIEWED };
                (prisma.quotation.findUnique as any).mockResolvedValueOnce(quotation);

                await expect(
                    quotationService.sendQuotation(quotation.id, mockUserId)
                ).rejects.toThrow(BadRequestError);

                expect(prisma.quotation.update).not.toHaveBeenCalled();
            });

            it('should BLOCK duplicate send from REPLIED status without new reply', async () => {
                const quotation = {
                    ...mockQuotation,
                    status: QuotationStatus.REPLIED,
                    adminReply: 'Previous response',
                };
                (prisma.quotation.findUnique as any).mockResolvedValueOnce(quotation);

                await expect(
                    quotationService.sendQuotation(quotation.id, mockUserId)
                ).rejects.toThrow(BadRequestError);

                expect(prisma.quotation.update).not.toHaveBeenCalled();
            });
        });

        describe('Valid Reply Scenarios', () => {
            it('should ALLOW reply from SENT status with admin reply', async () => {
                const quotation = { ...mockQuotation, status: QuotationStatus.SENT };
                (prisma.quotation.findUnique as any).mockResolvedValueOnce(quotation);
                (prisma.quotation.update as any).mockResolvedValueOnce({
                    ...quotation,
                    status: QuotationStatus.REPLIED,
                    adminReply: 'Customer inquiry response',
                });
                (prisma.quotationActivity.create as any).mockResolvedValueOnce({});

                const result = await quotationService.sendQuotation(
                    quotation.id,
                    mockUserId,
                    'Customer inquiry response'
                );

                expect(result.status).toBe(QuotationStatus.REPLIED);
                expect(prisma.quotation.update).toHaveBeenCalled();
            });

            it('should ALLOW reply from VIEWED status with admin reply', async () => {
                const quotation = { ...mockQuotation, status: QuotationStatus.VIEWED };
                (prisma.quotation.findUnique as any).mockResolvedValueOnce(quotation);
                (prisma.quotation.update as any).mockResolvedValueOnce({
                    ...quotation,
                    status: QuotationStatus.REPLIED,
                    adminReply: 'Thank you for viewing',
                });
                (prisma.quotationActivity.create as any).mockResolvedValueOnce({});

                const result = await quotationService.sendQuotation(
                    quotation.id,
                    mockUserId,
                    'Thank you for viewing'
                );

                expect(result.status).toBe(QuotationStatus.REPLIED);
            });

            it('should ALLOW updating existing reply (REPLIED → REPLIED with new reply)', async () => {
                const quotation = {
                    ...mockQuotation,
                    status: QuotationStatus.REPLIED,
                    adminReply: 'Initial response',
                };
                (prisma.quotation.findUnique as any).mockResolvedValueOnce(quotation);
                (prisma.quotation.update as any).mockResolvedValueOnce({
                    ...quotation,
                    adminReply: 'Updated response',
                });
                (prisma.quotationActivity.create as any).mockResolvedValueOnce({});

                const result = await quotationService.sendQuotation(
                    quotation.id,
                    mockUserId,
                    'Updated response'
                );

                expect(prisma.quotation.update).toHaveBeenCalled();
                expect(prisma.quotationActivity.create).toHaveBeenCalled();
            });
        });

        describe('Terminal States - Cannot Send', () => {
            [
                QuotationStatus.APPROVED,
                QuotationStatus.REJECTED,
                QuotationStatus.CONVERTED,
                QuotationStatus.EXPIRED,
            ].forEach((terminalStatus) => {
                it(`should BLOCK send from ${terminalStatus} status`, async () => {
                    const quotation = { ...mockQuotation, status: terminalStatus };
                    (prisma.quotation.findUnique as any).mockResolvedValueOnce(quotation);

                    await expect(
                        quotationService.sendQuotation(quotation.id, mockUserId)
                    ).rejects.toThrow(BadRequestError);

                    expect(prisma.quotation.update).not.toHaveBeenCalled();
                });

                it(`should include terminal state error for ${terminalStatus}`, async () => {
                    const quotation = { ...mockQuotation, status: terminalStatus };
                    (prisma.quotation.findUnique as any).mockResolvedValueOnce(quotation);

                    try {
                        await quotationService.sendQuotation(quotation.id, mockUserId);
                        throw new Error('Should have thrown');
                    } catch (err: any) {
                        expect(err.message).toContain('Terminal states cannot be sent');
                    }
                });
            });
        });

        describe('Activity Logging', () => {
            it('should create activity log for initial send', async () => {
                const quotation = { ...mockQuotation, status: QuotationStatus.DRAFT };
                (prisma.quotation.findUnique as any).mockResolvedValueOnce(quotation);
                (prisma.quotation.update as any).mockResolvedValueOnce({
                    ...quotation,
                    status: QuotationStatus.SENT,
                });
                (prisma.quotationActivity.create as any).mockResolvedValueOnce({});

                await quotationService.sendQuotation(quotation.id, mockUserId);

                expect(prisma.quotationActivity.create).toHaveBeenCalledWith({
                    data: expect.objectContaining({
                        quotationId: quotation.id,
                        action: QuotationActivityType.SENT,
                        performedBy: mockUserId,
                    }),
                });
            });

            it('should create activity log with descriptive note for reply', async () => {
                const quotation = { ...mockQuotation, status: QuotationStatus.DRAFT };
                (prisma.quotation.findUnique as any).mockResolvedValueOnce(quotation);
                (prisma.quotation.update as any).mockResolvedValueOnce({
                    ...quotation,
                    status: QuotationStatus.REPLIED,
                });
                (prisma.quotationActivity.create as any).mockResolvedValueOnce({});

                await quotationService.sendQuotation(
                    quotation.id,
                    mockUserId,
                    'Additional details'
                );

                expect(prisma.quotationActivity.create).toHaveBeenCalledWith({
                    data: expect.objectContaining({
                        note: expect.stringContaining('Initial send with'),
                    }),
                });
            });
        });

        describe('NotFoundError Handling', () => {
            it('should throw NotFoundError if quotation does not exist', async () => {
                (prisma.quotation.findUnique as any).mockResolvedValueOnce(null);

                await expect(
                    quotationService.sendQuotation('nonexistent-id', mockUserId)
                ).rejects.toThrow(NotFoundError);

                expect(prisma.quotation.update).not.toHaveBeenCalled();
            });
        });

        describe('Empty Reply Handling', () => {
            it('should treat empty string reply as no reply (duplicate prevention)', async () => {
                const quotation = { ...mockQuotation, status: QuotationStatus.SENT };
                (prisma.quotation.findUnique as any).mockResolvedValueOnce(quotation);

                await expect(
                    quotationService.sendQuotation(quotation.id, mockUserId, '')
                ).rejects.toThrow(BadRequestError);

                expect(prisma.quotation.update).not.toHaveBeenCalled();
            });

            it('should treat whitespace-only reply as no reply (duplicate prevention)', async () => {
                const quotation = { ...mockQuotation, status: QuotationStatus.SENT };
                (prisma.quotation.findUnique as any).mockResolvedValueOnce(quotation);

                await expect(
                    quotationService.sendQuotation(quotation.id, mockUserId, '   \t\n   ')
                ).rejects.toThrow(BadRequestError);

                expect(prisma.quotation.update).not.toHaveBeenCalled();
            });
        });

        describe('Race Condition Safety', () => {
            it('should use consistent timestamps for resend attempts', async () => {
                const quotation = { ...mockQuotation, status: QuotationStatus.DRAFT };
                (prisma.quotation.findUnique as any).mockResolvedValueOnce(quotation);
                (prisma.quotation.update as any).mockResolvedValueOnce({
                    ...quotation,
                    status: QuotationStatus.SENT,
                });
                (prisma.quotationActivity.create as any).mockResolvedValueOnce({});

                const beforeTime = new Date();
                await quotationService.sendQuotation(quotation.id, mockUserId);
                const afterTime = new Date();

                const updateCall = (prisma.quotation.update as any).mock.calls[0][0];
                expect(updateCall.data.updatedAt).toBeDefined();
                expect(updateCall.data.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
                expect(updateCall.data.updatedAt.getTime()).toBeLessThanOrEqual(afterTime.getTime());
            });
        });
    });

    // ────────────────────────────────────────────────────────────────────────
    // UPDATE QUOTATION TESTS - EMPTY PAYLOAD VALIDATION
    // ────────────────────────────────────────────────────────────────────────

    describe('updateQuotation() - Empty Payload Validation', () => {
        const mockQuotation = {
            id: 'q-update-001',
            status: QuotationStatus.DRAFT,
            customerName: 'Test Customer',
            customerEmail: 'test@example.com',
            quotationNumber: 'QT-2024-UPDATE',
            items: [],
            subtotal: 0,
            discount: 0,
            tax: 0,
            total: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        describe('Empty Payload Rejection', () => {
            it('should reject completely empty update payload ({})', async () => {
                (prisma.quotation.findUnique as any).mockResolvedValueOnce(mockQuotation);

                await expect(
                    quotationService.updateQuotation(mockQuotation.id, {}, mockUserId)
                ).rejects.toThrow(BadRequestError);
                
                await expect(
                    quotationService.updateQuotation(mockQuotation.id, {}, mockUserId)
                ).rejects.toThrow('At least one field is required to update quotation');

                expect(prisma.quotation.update).not.toHaveBeenCalled();
                expect(prisma.quotationActivity.create).not.toHaveBeenCalled();
            });

            it('should reject update with only undefined fields', async () => {
                (prisma.quotation.findUnique as any).mockResolvedValueOnce(mockQuotation);

                await expect(
                    quotationService.updateQuotation(mockQuotation.id, {
                        customerName: undefined,
                        customerEmail: undefined,
                        notes: undefined,
                    }, mockUserId)
                ).rejects.toThrow(BadRequestError);

                expect(prisma.quotation.update).not.toHaveBeenCalled();
            });

            it('should reject update with only zero discount/taxRate when no other fields', async () => {
                (prisma.quotation.findUnique as any).mockResolvedValueOnce(mockQuotation);

                await expect(
                    quotationService.updateQuotation(mockQuotation.id, {
                        discount: 0,
                        taxRate: 0,
                    }, mockUserId)
                ).rejects.toThrow(BadRequestError);

                expect(prisma.quotation.update).not.toHaveBeenCalled();
            });

            it('should reject update with empty items array and no other fields', async () => {
                (prisma.quotation.findUnique as any).mockResolvedValueOnce(mockQuotation);

                await expect(
                    quotationService.updateQuotation(mockQuotation.id, {
                        items: [],
                    }, mockUserId)
                ).rejects.toThrow(BadRequestError);

                expect(prisma.quotation.update).not.toHaveBeenCalled();
            });

            it('should reject update with null/empty string values', async () => {
                (prisma.quotation.findUnique as any).mockResolvedValueOnce(mockQuotation);

                await expect(
                    quotationService.updateQuotation(mockQuotation.id, {
                        customerName: null as any,
                        customerEmail: null as any,
                        notes: null as any,
                    }, mockUserId)
                ).rejects.toThrow(BadRequestError);

                expect(prisma.quotation.update).not.toHaveBeenCalled();
            });
        });

        describe('Valid Single Field Updates', () => {
            it('should allow update with customerName only', async () => {
                (prisma.quotation.findUnique as any).mockResolvedValueOnce(mockQuotation);
                const updated = { ...mockQuotation, customerName: 'Updated Name' };
                (prisma.quotation.update as any).mockResolvedValueOnce(updated);
                (prisma.quotationActivity.create as any).mockResolvedValueOnce({});

                const result = await quotationService.updateQuotation(
                    mockQuotation.id,
                    { customerName: 'Updated Name' },
                    mockUserId
                );

                expect(result.customerName).toBe('Updated Name');
                expect(prisma.quotation.update).toHaveBeenCalled();
                expect(prisma.quotationActivity.create).toHaveBeenCalled();
            });

            it('should allow update with customerEmail only', async () => {
                (prisma.quotation.findUnique as any).mockResolvedValueOnce(mockQuotation);
                const updated = { ...mockQuotation, customerEmail: 'newemail@example.com' };
                (prisma.quotation.update as any).mockResolvedValueOnce(updated);
                (prisma.quotationActivity.create as any).mockResolvedValueOnce({});

                const result = await quotationService.updateQuotation(
                    mockQuotation.id,
                    { customerEmail: 'newemail@example.com' },
                    mockUserId
                );

                expect(result.customerEmail).toBe('newemail@example.com');
                expect(prisma.quotation.update).toHaveBeenCalled();
            });

            it('should allow update with notes only', async () => {
                (prisma.quotation.findUnique as any).mockResolvedValueOnce(mockQuotation);
                const updated = { ...mockQuotation, notes: 'Updated notes' };
                (prisma.quotation.update as any).mockResolvedValueOnce(updated);
                (prisma.quotationActivity.create as any).mockResolvedValueOnce({});

                const result = await quotationService.updateQuotation(
                    mockQuotation.id,
                    { notes: 'Updated notes' },
                    mockUserId
                );

                expect(result.notes).toBe('Updated notes');
                expect(prisma.quotation.update).toHaveBeenCalled();
            });

            it('should allow update with discount > 0', async () => {
                (prisma.quotation.findUnique as any).mockResolvedValueOnce(mockQuotation);
                const updated = { ...mockQuotation, discount: 50 };
                (prisma.quotation.update as any).mockResolvedValueOnce(updated);
                (prisma.quotationActivity.create as any).mockResolvedValueOnce({});

                const result = await quotationService.updateQuotation(
                    mockQuotation.id,
                    { discount: 50 },
                    mockUserId
                );

                expect(result.discount).toBe(50);
                expect(prisma.quotation.update).toHaveBeenCalled();
            });

            it('should allow update with taxRate > 0', async () => {
                (prisma.quotation.findUnique as any).mockResolvedValueOnce(mockQuotation);
                const updated = { ...mockQuotation, taxRate: 15 };
                (prisma.quotation.update as any).mockResolvedValueOnce(updated);
                (prisma.quotationActivity.create as any).mockResolvedValueOnce({});

                const result = await quotationService.updateQuotation(
                    mockQuotation.id,
                    { taxRate: 15 },
                    mockUserId
                );

                expect(result.taxRate).toBe(15);
                expect(prisma.quotation.update).toHaveBeenCalled();
            });

            it('should allow update with non-empty items array', async () => {
                const mockQuotationWithItems = { ...mockQuotation };
                (prisma.quotation.findUnique as any).mockResolvedValueOnce(mockQuotationWithItems);
                
                const mockProduct = {
                    id: 'prod-123',
                    price: 100,
                    translations: [{ name: 'Test Product' }],
                };
                (prisma.product.findUnique as any).mockResolvedValueOnce(mockProduct);
                
                const updated = { ...mockQuotation, items: [{ productId: 'prod-123', quantity: 5 }] };
                (prisma.quotationItem.deleteMany as any).mockResolvedValueOnce({});
                (prisma.quotationItem.createMany as any).mockResolvedValueOnce({});
                (prisma.quotation.update as any).mockResolvedValueOnce(updated);
                (prisma.quotationActivity.create as any).mockResolvedValueOnce({});

                const result = await quotationService.updateQuotation(
                    mockQuotation.id,
                    { items: [{ productId: 'prod-123', quantity: 5, discount: 0 }] },
                    mockUserId
                );

                expect(prisma.quotation.update).toHaveBeenCalled();
                expect(prisma.quotationActivity.create).toHaveBeenCalled();
            });
        });

        describe('Valid Multiple Field Updates', () => {
            it('should allow update with multiple fields', async () => {
                (prisma.quotation.findUnique as any).mockResolvedValueOnce(mockQuotation);
                const updated = {
                    ...mockQuotation,
                    customerName: 'New Name',
                    customerEmail: 'new@example.com',
                    notes: 'Updated notes'
                };
                (prisma.quotation.update as any).mockResolvedValueOnce(updated);
                (prisma.quotationActivity.create as any).mockResolvedValueOnce({});

                const result = await quotationService.updateQuotation(
                    mockQuotation.id,
                    {
                        customerName: 'New Name',
                        customerEmail: 'new@example.com',
                        notes: 'Updated notes'
                    },
                    mockUserId
                );

                expect(prisma.quotation.update).toHaveBeenCalled();
                expect(prisma.quotationActivity.create).toHaveBeenCalled();
            });

            it('should allow update with discount and taxRate together', async () => {
                (prisma.quotation.findUnique as any).mockResolvedValueOnce(mockQuotation);
                const updated = { ...mockQuotation, discount: 50, taxRate: 15 };
                (prisma.quotation.update as any).mockResolvedValueOnce(updated);
                (prisma.quotationActivity.create as any).mockResolvedValueOnce({});

                const result = await quotationService.updateQuotation(
                    mockQuotation.id,
                    { discount: 50, taxRate: 15 },
                    mockUserId
                );

                expect(prisma.quotation.update).toHaveBeenCalled();
            });
        });

        describe('Non-Editable Status Handling', () => {
            it('should reject update on APPROVED quotation regardless of payload', async () => {
                const approvedQuotation = { ...mockQuotation, status: QuotationStatus.APPROVED };
                (prisma.quotation.findUnique as any).mockResolvedValueOnce(approvedQuotation);

                await expect(
                    quotationService.updateQuotation(
                        mockQuotation.id,
                        { customerName: 'New Name' },
                        mockUserId
                    )
                ).rejects.toThrow(BadRequestError);

                expect(prisma.quotation.update).not.toHaveBeenCalled();
            });

            it('should reject update on CONVERTED quotation even with valid data', async () => {
                const convertedQuotation = { ...mockQuotation, status: QuotationStatus.CONVERTED };
                (prisma.quotation.findUnique as any).mockResolvedValueOnce(convertedQuotation);

                await expect(
                    quotationService.updateQuotation(
                        mockQuotation.id,
                        { notes: 'New notes' },
                        mockUserId
                    )
                ).rejects.toThrow(BadRequestError);

                expect(prisma.quotation.update).not.toHaveBeenCalled();
            });

            it('should reject update on REJECTED quotation even with valid data', async () => {
                const rejectedQuotation = { ...mockQuotation, status: QuotationStatus.REJECTED };
                (prisma.quotation.findUnique as any).mockResolvedValueOnce(rejectedQuotation);

                await expect(
                    quotationService.updateQuotation(
                        mockQuotation.id,
                        { customerName: 'New Name' },
                        mockUserId
                    )
                ).rejects.toThrow(BadRequestError);

                expect(prisma.quotation.update).not.toHaveBeenCalled();
            });
        });

        describe('Error Messages and Logging', () => {
            it('should use consistent error message for empty updates', async () => {
                (prisma.quotation.findUnique as any).mockResolvedValueOnce(mockQuotation);

                const error1 = await quotationService.updateQuotation(mockQuotation.id, {}, mockUserId)
                    .catch((e: any) => e.message);
                
                (prisma.quotation.findUnique as any).mockResolvedValueOnce(mockQuotation);
                const error2 = await quotationService.updateQuotation(
                    mockQuotation.id,
                    { discount: 0, taxRate: 0 },
                    mockUserId
                ).catch((e: any) => e.message);

                expect(error1).toBe(error2);
                expect(error1).toContain('At least one field is required');
            });

            it('should not log activity when update is rejected for empty payload', async () => {
                (prisma.quotation.findUnique as any).mockResolvedValueOnce(mockQuotation);

                await quotationService.updateQuotation(mockQuotation.id, {}, mockUserId)
                    .catch(() => {}); // Suppress error for test

                expect(prisma.quotationActivity.create).not.toHaveBeenCalled();
            });

            it('should log activity only when update succeeds', async () => {
                (prisma.quotation.findUnique as any).mockResolvedValueOnce(mockQuotation);
                const updated = { ...mockQuotation, customerName: 'New Name' };
                (prisma.quotation.update as any).mockResolvedValueOnce(updated);
                (prisma.quotationActivity.create as any).mockResolvedValueOnce({});

                await quotationService.updateQuotation(
                    mockQuotation.id,
                    { customerName: 'New Name' },
                    mockUserId
                );

                expect(prisma.quotationActivity.create).toHaveBeenCalledWith(
                    expect.objectContaining({
                        data: expect.objectContaining({
                            quotationId: mockQuotation.id,
                            action: QuotationActivityType.EDITED,
                            performedBy: mockUserId
                        })
                    })
                );
            });
        });
    });
});
