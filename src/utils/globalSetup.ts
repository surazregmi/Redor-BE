// src/utils/globalSetup.ts

// Fix BigInt serialization for JSON responses
(BigInt.prototype as any).toJSON = function () {
    return this.toString();
};
