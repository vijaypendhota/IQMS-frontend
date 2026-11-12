
export const hasPermission = (user, permission) => {
  if (!user || !permission) {
    return false;
  }

  if (!Array.isArray(user.permissions)) {
    return false;
  }

  return user.permissions.includes(permission);
};

export const hasAnyPermission = (user, permissions = []) => {
  if (!Array.isArray(permissions)) {
    return false;
  }

  return permissions.some((permission) =>
    hasPermission(user, permission)
  );
};

export const hasAllPermissions = (user, permissions = []) => {
  if (!Array.isArray(permissions)) {
    return false;
  }

  return permissions.every((permission) =>
    hasPermission(user, permission)
  );
};
