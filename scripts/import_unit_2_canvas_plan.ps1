param(
    [Parameter(Mandatory = $true)]
    [string]$CanvasPath,

    [string]$OutputPath = (Join-Path $PSScriptRoot "..\docs\product\unit-2-curriculum.json")
)

$ErrorActionPreference = "Stop"

function Read-JsonConstant {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Source,

        [Parameter(Mandatory = $true)]
        [string]$Name
    )

    $pattern = "const\s+$([regex]::Escape($Name))\s*=\s*(.*?);\r?\n"
    $match = [regex]::Match(
        $Source,
        $pattern,
        [System.Text.RegularExpressions.RegexOptions]::Singleline
    )
    if (-not $match.Success) {
        throw "The canvas does not contain the expected JSON constant '$Name'."
    }

    return $match.Groups[1].Value | ConvertFrom-Json -Depth 100
}

$resolvedCanvasPath = (Resolve-Path -LiteralPath $CanvasPath).Path
$decodedCanvas = [System.Net.WebUtility]::HtmlDecode(
    [System.IO.File]::ReadAllText($resolvedCanvasPath)
)

# The visualization is untrusted input. Only parse the four JSON literals used by
# the curriculum canvas; never execute its JavaScript or load its iframe.
$course = Read-JsonConstant -Source $decodedCanvas -Name "plannedCourseDetails"
$cardCorrections = Read-JsonConstant -Source $decodedCanvas -Name "planCorrections"
$metadataCorrections = Read-JsonConstant -Source $decodedCanvas -Name "planMetadataCorrections"

$unit = @($course | Where-Object { $_.unit -eq 2 })
if ($unit.Count -ne 1) {
    throw "Expected exactly one Unit 2 plan, found $($unit.Count)."
}
$unit = $unit[0]

foreach ($lesson in $unit.lessons) {
    foreach ($stageProperty in $lesson.stages.PSObject.Properties) {
        $stageName = $stageProperty.Name
        $rows = @($stageProperty.Value)
        for ($rowIndex = 0; $rowIndex -lt $rows.Count; $rowIndex += 1) {
            $row = @($rows[$rowIndex])
            $key = "$($lesson.id)|$stageName|$($row[0])"
            $correction = $cardCorrections.PSObject.Properties[$key]
            if ($null -ne $correction) {
                $rows[$rowIndex] = @($correction.Value)
            }
        }
        $stageProperty.Value = $rows
    }

    $metadataCorrection = $metadataCorrections.PSObject.Properties[$lesson.id]
    if ($null -ne $metadataCorrection) {
        $purposefulReview = $metadataCorrection.Value.purposefulReview
        if ($null -ne $purposefulReview) {
            $lesson.purposeful_review_slides = @($purposefulReview)
        }
    }
}

# The newest explicit image decisions supersede the older canvas wording.
$lesson21 = $unit.lessons | Where-Object { $_.id -eq "2.1" }
$lesson21.scene_contract.hospital = "hospital exterior identified only by a large H and universal medical symbol; never spell HOSPITAL in the image"
$lesson21.scene_contract.restaurant = "unmistakable restaurant exterior with entrance, dining tables, and warm service cues; no written RESTAURANT label"
$lesson21.scene_contract.store = "small storefront with display windows, visible shelves, and a green awning; no written STORE label and not a restaurant"

$lesson26 = $unit.lessons | Where-Object { $_.id -eq "2.6" }
for ($number = 1; $number -le 10; $number += 1) {
    $key = "n$number"
    $starLabel = if ($number -eq 1) { "star" } else { "stars" }
    $lesson26.scene_contract.$key = "photorealistic brushed-metal numeral $number with exactly $number separate gold $starLabel on a dark adult studio background; no plain dot counter and no cartoon treatment"
}

$lesson27 = $unit.lessons | Where-Object { $_.id -eq "2.7" }
foreach ($color in @("red", "blue", "green", "black")) {
    $lesson27.scene_contract.$color = "large $color circular color puck centered on a neutral light background"
}
$lesson27.scene_contract.n2 = "reuse the established number-two card: photorealistic brushed-metal numeral 2 with exactly 2 separate gold stars on a dark adult studio background; no plain dot counter and no cartoon treatment"
$lesson27.scene_contract.n4 = "reuse the established number-four card: photorealistic brushed-metal numeral 4 with exactly 4 separate gold stars on a dark adult studio background; no plain dot counter and no cartoon treatment"

# Scene-contract prose describes established reuse, never formal human review
# status. Only the hash-bound semantic approval registry may claim approval.
foreach ($lesson in $unit.lessons) {
    foreach ($property in $lesson.scene_contract.PSObject.Properties) {
        if ($property.Value -isnot [string]) {
            continue
        }
        if ($property.Value.StartsWith("same approved ")) {
            $property.Value = "reuse the established " + $property.Value.Substring("same approved ".Length)
        }
        elseif ($property.Value.StartsWith("approved ")) {
            $property.Value = "reuse the established " + $property.Value.Substring("approved ".Length)
        }
    }
}

$payload = [ordered]@{
    source = [ordered]@{
        filename = [System.IO.Path]::GetFileName($resolvedCanvasPath)
        sha256 = (Get-FileHash -LiteralPath $resolvedCanvasPath -Algorithm SHA256).Hash
        import_policy = "Parsed JSON constants only; canvas code was not executed."
    }
    unit = $unit
}

$resolvedOutputPath = [System.IO.Path]::GetFullPath($OutputPath)
[System.IO.Directory]::CreateDirectory([System.IO.Path]::GetDirectoryName($resolvedOutputPath)) | Out-Null
$json = $payload | ConvertTo-Json -Depth 100
[System.IO.File]::WriteAllText(
    $resolvedOutputPath,
    "$json`n",
    [System.Text.UTF8Encoding]::new($false)
)

Write-Output $resolvedOutputPath
