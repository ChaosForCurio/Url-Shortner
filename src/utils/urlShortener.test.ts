import { describe, it, expect } from 'vitest';
import {
    isValidUrl,
    isValidAlias,
    isExpiringSoon,
    isExpired
} from './urlShortener';


describe('URL Shortener Logic', () => {

    describe('isValidUrl', () => {
        it('should validate correct URLs', () => {
            expect(isValidUrl('https://google.com')).toBe(true);
            expect(isValidUrl('http://example.org')).toBe(true);
        });

        it('should reject invalid URLs', () => {
            expect(isValidUrl('not-a-url')).toBe(false);
            expect(isValidUrl('ftp://example.com')).toBe(true); // FTP is allowed
            expect(isValidUrl('javascript:alert(1)')).toBe(false);
        });
    });

    describe('isValidAlias', () => {
        it('should validate correct aliases', () => {
            expect(isValidAlias('my-custom-alias')).toBe(true);
            expect(isValidAlias('marketing_2024')).toBe(true);
            expect(isValidAlias('123')).toBe(true);
        });

        it('should reject invalid aliases', () => {
            expect(isValidAlias('ab')).toBe(false); // Too short
            expect(isValidAlias('a'.repeat(31))).toBe(false); // Too long
            expect(isValidAlias('invalid char!')).toBe(false);
        });
    });

    describe('Expiration Logic', () => {
        const now = Date.now();
        const oneHour = 3600000;

        it('should correctly identify expired URLs', () => {
            expect(isExpired(now - oneHour)).toBe(true);
            expect(isExpired(now + oneHour)).toBe(false);
            expect(isExpired(null)).toBe(false);
        });

        it('should correctly identify URLs expiring soon', () => {
            expect(isExpiringSoon(now + oneHour - 1000)).toBe(true); // < 1h left
            expect(isExpiringSoon(now + oneHour * 2)).toBe(false); // > 1h left
        });
    });
});
