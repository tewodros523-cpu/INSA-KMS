package com.enterprise.kms.service;

import com.enterprise.kms.entity.SystemSetting;
import com.enterprise.kms.repository.SystemSettingRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

@Service
public class SystemSettingService {
    private final SystemSettingRepository systemSettingRepository;

    public SystemSettingService(SystemSettingRepository systemSettingRepository) {
        this.systemSettingRepository = systemSettingRepository;
    }

    public List<SystemSetting> getAllSettings() {
        return systemSettingRepository.findAll();
    }

    @jakarta.annotation.PostConstruct
    @Transactional
    public void initDefaultStorageSettings() {
        seedIfMissing("storage.url.image", "/images", "Base URL or path for storing and retrieving uploaded images (e.g. /images, /api/v1/documents/media, or https://cdn.enterprise.internal/images)");
        seedIfMissing("storage.url.video", "/videos", "Base URL or path for streaming video media and multimedia assets (e.g. /videos, /api/v1/documents/media, or https://cdn.enterprise.internal/videos)");
        seedIfMissing("storage.url.document", "/api/v1/documents", "Base URL or endpoint for document files, attachments, and binary downloads (e.g. /api/v1/documents, or https://storage.enterprise.internal/documents)");
    }

    private void seedIfMissing(String key, String defaultValue, String description) {
        SystemSetting s = systemSettingRepository.findById(key).orElse(null);
        if (s == null) {
            s = new SystemSetting();
            s.setSettingKey(key);
            s.setSettingValue(defaultValue);
            s.setDescription(description);
            s.setUpdatedAt(OffsetDateTime.now());
            systemSettingRepository.save(s);
        } else if (s.getDescription() == null || s.getDescription().isBlank()) {
            s.setDescription(description);
            systemSettingRepository.save(s);
        }
    }

    @Transactional
    public List<SystemSetting> updateSettings(Map<String, String> settings) {
        settings.forEach((key, value) -> {
            if (key == null || key.isBlank() || value == null) {
                return;
            }
            SystemSetting setting = systemSettingRepository.findById(key)
                    .orElseGet(() -> {
                        SystemSetting s = new SystemSetting();
                        s.setSettingKey(key);
                        if ("storage.url.image".equals(key)) {
                            s.setDescription("Base URL or path for storing and retrieving uploaded images (e.g. /images, /api/v1/documents/media, or https://cdn.enterprise.internal/images)");
                        } else if ("storage.url.video".equals(key)) {
                            s.setDescription("Base URL or path for streaming video media and multimedia assets (e.g. /videos, /api/v1/documents/media, or https://cdn.enterprise.internal/videos)");
                        } else if ("storage.url.document".equals(key)) {
                            s.setDescription("Base URL or endpoint for document files, attachments, and binary downloads (e.g. /api/v1/documents, or https://storage.enterprise.internal/documents)");
                        }
                        return s;
                    });
            setting.setSettingValue(value);
            setting.setUpdatedAt(OffsetDateTime.now());
            systemSettingRepository.save(setting);
        });
        return getAllSettings();
    }

    public String getSettingValue(String key, String defaultValue) {
        return systemSettingRepository.findById(key)
                .map(SystemSetting::getSettingValue)
                .orElse(defaultValue);
    }

    public String getImageStorageUrl() {
        return getSettingValue("storage.url.image", "/images");
    }

    public String getVideoStorageUrl() {
        return getSettingValue("storage.url.video", "/videos");
    }

    public String getDocumentStorageUrl() {
        return getSettingValue("storage.url.document", "/api/v1/documents");
    }
}
